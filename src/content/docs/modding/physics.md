---
title: Physics System
description: Learn about Hytale's physics simulation system for entities and projectiles.
sidebar:
  order: 8
---

Hytale uses a sophisticated physics system for simulating entity movement, projectile trajectories, and physical interactions. The physics system supports multiple numerical integrators, force accumulation, and collision detection.

## Architecture Overview

```
Physics System
├── PhysicsBodyState         - Position and velocity state
├── ForceAccumulator         - Accumulates forces per tick
├── ForceProvider            - Interface for force sources
│   ├── ForceProviderStandard    - Gravity, drag, friction
│   └── ForceProviderEntity      - Entity-specific forces
├── PhysicsBodyStateUpdater  - Numerical integration
│   ├── SymplecticEuler          - Fast, energy-preserving
│   ├── Midpoint                 - Second-order accuracy
│   └── RK4                      - Fourth-order accuracy
└── CollisionModule          - Block and entity collisions
```

## Core Concepts

### Physics Body State

The `PhysicsBodyState` class holds the kinematic state of a physics body:

```java
import com.hypixel.hytale.server.core.modules.physics.util.PhysicsBodyState;
import com.hypixel.hytale.math.vector.Vector3d;

public class PhysicsBodyState {
    public final Vector3d position = new Vector3d();
    public final Vector3d velocity = new Vector3d();
}
```

Physics simulations maintain two states - `before` and `after` - to compute state transitions during each tick.

### Physics Constants

The `PhysicsConstants` class defines global physics parameters:

```java
import com.hypixel.hytale.server.core.modules.physics.util.PhysicsConstants;

public class PhysicsConstants {
    public static final double GRAVITY_ACCELERATION = 32.0;  // blocks/sec^2
}
```

### Physics Values Component

Entities can have physics properties through the `PhysicsValues` component:

```java
import com.hypixel.hytale.server.core.modules.physics.component.PhysicsValues;

public class PhysicsValues implements Component<EntityStore> {
    protected double mass = 1.0;              // Default mass
    protected double dragCoefficient = 0.5;   // Air resistance
    protected boolean invertedGravity = false; // Gravity direction

    public double getMass() { return mass; }
    public double getDragCoefficient() { return dragCoefficient; }
    public boolean isInvertedGravity() { return invertedGravity; }
}
```

The component supports serialization through a codec:

```java
public static final BuilderCodec<PhysicsValues> CODEC = BuilderCodec.builder(PhysicsValues.class, PhysicsValues::new)
    .append(new KeyedCodec<>("Mass", Codec.DOUBLE),
        (c, v) -> c.mass = v, c -> c.mass)
    .addValidator(Validators.greaterThan(0.0)).add()
    .append(new KeyedCodec<>("DragCoefficient", Codec.DOUBLE),
        (c, v) -> c.dragCoefficient = v, c -> c.dragCoefficient)
    .addValidator(Validators.greaterThanOrEqual(0.0)).add()
    .append(new KeyedCodec<>("InvertedGravity", Codec.BOOLEAN),
        (c, v) -> c.invertedGravity = v, c -> c.invertedGravity).add()
    .build();
```

## Force System

### Force Provider Interface

Forces are contributed by implementing `ForceProvider`:

```java
import com.hypixel.hytale.server.core.modules.physics.util.ForceProvider;
import com.hypixel.hytale.server.core.modules.physics.util.ForceAccumulator;
import com.hypixel.hytale.server.core.modules.physics.util.PhysicsBodyState;

public interface ForceProvider {
    void update(PhysicsBodyState state, ForceAccumulator accumulator, boolean onGround);
}
```

### Force Accumulator

The `ForceAccumulator` collects all forces applied during a physics tick:

```java
import com.hypixel.hytale.server.core.modules.physics.util.ForceAccumulator;
import com.hypixel.hytale.math.vector.Vector3d;

public class ForceAccumulator {
    public double speed;                              // Current speed
    public final Vector3d force = new Vector3d();     // Accumulated force
    public final Vector3d resistanceForceLimit = new Vector3d();  // Max resistance

    public void initialize(PhysicsBodyState state, double mass, double timeStep) {
        this.force.assign(Vector3d.ZERO);
        this.speed = state.velocity.length();
        // Limit resistance to prevent velocity reversal
        this.resistanceForceLimit.assign(state.velocity).scale(-mass / timeStep);
    }
}
```

### Standard Force Provider

The `ForceProviderStandard` implements common physical forces:

```java
import com.hypixel.hytale.server.core.modules.physics.util.ForceProviderStandard;

public abstract class ForceProviderStandard implements ForceProvider {
    protected Vector3d dragForce = new Vector3d();

    // Required abstract methods
    public abstract double getMass(double volume);
    public abstract double getVolume();
    public abstract double getDensity();
    public abstract double getProjectedArea(PhysicsBodyState state, double speed);
    public abstract double getFrictionCoefficient();
    public abstract ForceProviderStandardState getForceProviderStandardState();

    @Override
    public void update(PhysicsBodyState bodyState, ForceAccumulator accumulator, boolean onGround) {
        ForceProviderStandardState state = getForceProviderStandardState();

        // External forces
        accumulator.force.add(state.externalForce);

        // Drag force (air resistance)
        double dragForceDivSpeed = state.dragCoefficient *
            getProjectedArea(bodyState, accumulator.speed) * accumulator.speed;
        dragForce.assign(bodyState.velocity).scale(-dragForceDivSpeed);
        clipForce(dragForce, accumulator.resistanceForceLimit);
        accumulator.force.add(dragForce);

        // Gravity and friction
        double gravityForce = -state.gravity * getMass(getVolume());
        if (onGround) {
            // Apply friction when on ground
            double frictionForce = (gravityForce + state.externalForce.y) * getFrictionCoefficient();
            if (accumulator.speed > 0.0 && frictionForce > 0.0) {
                frictionForce /= accumulator.speed;
                accumulator.force.x -= bodyState.velocity.x * frictionForce;
                accumulator.force.z -= bodyState.velocity.z * frictionForce;
            }
        } else {
            // Apply gravity when airborne
            accumulator.force.y += gravityForce;
        }

        // Buoyancy (displaced fluid mass)
        if (state.displacedMass != 0.0) {
            accumulator.force.y += state.displacedMass * state.gravity;
        }
    }
}
```

### Force Provider State

The `ForceProviderStandardState` holds runtime force configuration:

```java
import com.hypixel.hytale.server.core.modules.physics.util.ForceProviderStandardState;

public class ForceProviderStandardState {
    public double displacedMass;        // For buoyancy calculations
    public double dragCoefficient;      // Current drag coefficient
    public double gravity;              // Gravity strength

    public final Vector3d nextTickVelocity = new Vector3d();     // Velocity override
    public final Vector3d externalVelocity = new Vector3d();     // Additive velocity
    public final Vector3d externalAcceleration = new Vector3d(); // Additive acceleration
    public final Vector3d externalForce = new Vector3d();        // Additive force
    public final Vector3d externalImpulse = new Vector3d();      // Instant impulse

    public void convertToForces(double dt, double mass) {
        // Convert acceleration and impulse to force
        externalForce.addScaled(externalAcceleration, 1.0 / mass);
        externalForce.addScaled(externalImpulse, 1.0 / dt);
        externalAcceleration.assign(Vector3d.ZERO);
        externalImpulse.assign(Vector3d.ZERO);
    }

    public void updateVelocity(Vector3d velocity) {
        // Apply velocity override if set
        if (nextTickVelocity.x < Double.MAX_VALUE) {
            velocity.assign(nextTickVelocity);
            nextTickVelocity.assign(Double.MAX_VALUE, Double.MAX_VALUE, Double.MAX_VALUE);
        }
        velocity.add(externalVelocity);
        externalVelocity.assign(Vector3d.ZERO);
    }
}
```

## Numerical Integration

### Base State Updater

The `PhysicsBodyStateUpdater` provides the foundation for numerical integration:

```java
import com.hypixel.hytale.server.core.modules.physics.util.PhysicsBodyStateUpdater;

public class PhysicsBodyStateUpdater {
    protected static double MIN_VELOCITY = 1.0E-6;
    protected Vector3d acceleration = new Vector3d();
    protected final ForceAccumulator accumulator = new ForceAccumulator();

    public void update(PhysicsBodyState before, PhysicsBodyState after,
                       double mass, double dt, boolean onGround,
                       ForceProvider[] forceProviders) {
        computeAcceleration(before, onGround, forceProviders, mass, dt);
        updatePositionBeforeVelocity(before, after, dt);  // x' = x + v*dt
        updateAndClampVelocity(before, after, dt);        // v' = v + a*dt
    }

    protected void computeAcceleration(double mass) {
        // F = ma, so a = F/m
        acceleration.assign(accumulator.force).scale(1.0 / mass);
    }
}
```

### Symplectic Euler Integrator

The default integrator uses Symplectic Euler for energy conservation:

```java
import com.hypixel.hytale.server.core.modules.physics.util.PhysicsBodyStateUpdaterSymplecticEuler;

public class PhysicsBodyStateUpdaterSymplecticEuler extends PhysicsBodyStateUpdater {
    @Override
    public void update(PhysicsBodyState before, PhysicsBodyState after,
                       double mass, double dt, boolean onGround,
                       ForceProvider[] forceProviders) {
        computeAcceleration(before, onGround, forceProviders, mass, dt);
        updateAndClampVelocity(before, after, dt);        // v' = v + a*dt
        updatePositionAfterVelocity(before, after, dt);   // x' = x + v'*dt
    }
}
```

:::note
Symplectic Euler updates velocity first, then uses the new velocity for position. This preserves energy in oscillating systems better than standard Euler.
:::

### Midpoint Integrator

The Midpoint method provides second-order accuracy:

```java
import com.hypixel.hytale.server.core.modules.physics.util.PhysicsBodyStateUpdaterMidpoint;

public class PhysicsBodyStateUpdaterMidpoint extends PhysicsBodyStateUpdater {
    @Override
    public void update(PhysicsBodyState before, PhysicsBodyState after,
                       double mass, double dt, boolean onGround,
                       ForceProvider[] forceProviders) {
        double halfTime = 0.5 * dt;

        // First half-step
        computeAcceleration(before, onGround, forceProviders, mass, halfTime);
        updateVelocity(before, after, halfTime);
        updatePositionBeforeVelocity(before, after, halfTime);

        // Full step using midpoint state
        computeAcceleration(after, onGround, forceProviders, mass, dt);
        updateAndClampVelocity(before, after, dt);
        updatePositionAfterVelocity(before, after, dt);
    }
}
```

### RK4 Integrator

The Runge-Kutta 4 method provides fourth-order accuracy for complex trajectories:

```java
import com.hypixel.hytale.server.core.modules.physics.util.PhysicsBodyStateUpdaterRK4;

public class PhysicsBodyStateUpdaterRK4 extends PhysicsBodyStateUpdater {
    private final PhysicsBodyState state = new PhysicsBodyState();

    @Override
    public void update(PhysicsBodyState before, PhysicsBodyState after,
                       double mass, double dt, boolean onGround,
                       ForceProvider[] forceProviders) {
        double halfTime = dt * 0.5;

        // k1: Initial slope
        computeAcceleration(before, onGround, forceProviders, mass, halfTime);
        assignAcceleration(after);

        // k2: Midpoint using k1
        updateVelocity(before, state, halfTime);
        updatePositionBeforeVelocity(before, state, halfTime);
        computeAcceleration(state, onGround, forceProviders, mass, halfTime);
        addAcceleration(after, 2.0);

        // k3: Midpoint using k2
        updateVelocity(before, state, halfTime);
        updatePositionAfterVelocity(before, state, halfTime);
        computeAcceleration(state, onGround, forceProviders, mass, halfTime);
        addAcceleration(after, 2.0);

        // k4: End point using k3
        updateVelocity(before, state, dt);
        updatePositionAfterVelocity(before, state, dt);
        computeAcceleration(state, onGround, forceProviders, mass, dt);
        addAcceleration(after);

        // Weighted average: (k1 + 2*k2 + 2*k3 + k4) / 6
        convertAccelerationToVelocity(before, after, dt / 6.0);
        updatePositionAfterVelocity(before, after, dt);
    }
}
```

## Velocity Component

The `Velocity` component manages entity velocities and movement instructions:

```java
import com.hypixel.hytale.server.core.modules.physics.component.Velocity;
import com.hypixel.hytale.protocol.ChangeVelocityType;

public class Velocity implements Component<EntityStore> {
    protected final Vector3d velocity = new Vector3d();
    protected final Vector3d clientVelocity = new Vector3d();
    protected final List<Instruction> instructions = new ObjectArrayList<>();

    public void setZero() {
        set(0.0, 0.0, 0.0);
    }

    public void addForce(Vector3d force) {
        velocity.add(force);
    }

    public void addForce(double x, double y, double z) {
        velocity.add(x, y, z);
    }

    public void set(Vector3d newVelocity) {
        velocity.assign(newVelocity);
    }

    public double getSpeed() {
        return velocity.length();
    }

    public void addInstruction(Vector3d velocity, VelocityConfig config, ChangeVelocityType type) {
        instructions.add(new Instruction(velocity, config, type));
    }

    public Vector3d assignVelocityTo(Vector3d vector) {
        return vector.assign(velocity);
    }
}
```

## Collision Detection

### Physics Flags

The `PhysicsFlags` class defines collision categories:

```java
import com.hypixel.hytale.server.core.modules.physics.util.PhysicsFlags;

public class PhysicsFlags {
    public static final int NO_COLLISIONS = 0;
    public static final int ENTITY_COLLISIONS = 1;
    public static final int BLOCK_COLLISIONS = 2;
    public static final int ALL_COLLISIONS = 3;
}
```

### Collision Module

The `CollisionModule` provides collision detection utilities:

```java
import com.hypixel.hytale.server.core.modules.collision.CollisionModule;
import com.hypixel.hytale.server.core.modules.collision.CollisionResult;

// Check if movement is below threshold (essentially stationary)
boolean isStationary = CollisionModule.isBelowMovementThreshold(velocity);
// Threshold: velocity.squaredLength() < 1.0E-10

// Find collisions along a movement path
CollisionResult result = new CollisionResult();
boolean isFarDistance = CollisionModule.findCollisions(
    collider,           // Bounding box
    position,           // Current position
    velocity,           // Movement vector
    stopOnCollision,    // Stop searching on first collision
    result,             // Output results
    componentAccessor   // ECS accessor
);

// Short distance uses box intersection
// Far distance uses iterative ray-marching
if (isFarDistance) {
    CollisionModule.findBlockCollisionsIterative(world, collider, position, velocity, true, result);
} else {
    CollisionModule.findBlockCollisionsShortDistance(world, collider, position, velocity, result);
}
```

### Block Collision Provider

The `BlockCollisionProvider` handles block-level collision detection:

```java
import com.hypixel.hytale.server.core.modules.collision.BlockCollisionProvider;
import com.hypixel.hytale.server.core.modules.collision.IBlockCollisionConsumer;

BlockCollisionProvider provider = new BlockCollisionProvider();

// Configure collision materials (bitmask)
provider.setRequestedCollisionMaterials(6);  // Solid + Fluid

// Enable overlap detection for reporting
provider.setReportOverlaps(true);

// Cast collision ray
provider.cast(
    world,              // World reference
    boundingBox,        // Entity bounding box
    position,           // Current position
    velocity,           // Movement direction
    collisionConsumer,  // Handles collision events
    triggerTracker,     // Tracks trigger blocks
    1.0                 // Maximum relative distance
);
```

### Block Collision Consumer

Implement `IBlockCollisionConsumer` to handle collision events:

```java
import com.hypixel.hytale.server.core.modules.collision.IBlockCollisionConsumer;
import com.hypixel.hytale.server.core.modules.collision.BlockContactData;
import com.hypixel.hytale.server.core.modules.collision.BlockData;

public class MyCollisionHandler implements IBlockCollisionConsumer {
    @Override
    public Result onCollision(int blockX, int blockY, int blockZ,
                              Vector3d direction, BlockContactData contactData,
                              BlockData blockData, Box collider) {
        // Handle solid block collision
        if (blockData.getBlockType().getMaterial() == BlockMaterial.Solid) {
            if (contactData.isOverlapping()) {
                // Entity is inside the block - push out
                return Result.CONTINUE;
            }

            // Calculate bounce or stop
            Vector3d normal = contactData.getCollisionNormal();
            double alignment = direction.dot(normal);

            if (alignment < 0.0) {
                // Moving into surface - collision!
                return Result.STOP;
            }
        }

        return Result.CONTINUE;
    }

    @Override
    public Result probeCollisionDamage(int blockX, int blockY, int blockZ,
                                       Vector3d direction, BlockContactData collisionData,
                                       BlockData blockData) {
        return Result.CONTINUE;
    }

    @Override
    public void onCollisionDamage(int blockX, int blockY, int blockZ,
                                  Vector3d direction, BlockContactData collisionData,
                                  BlockData blockData) {
        // Handle damage blocks (lava, thorns, etc.)
    }

    @Override
    public Result onCollisionSliceFinished() {
        return Result.CONTINUE;
    }

    @Override
    public void onCollisionFinished() {
        // Cleanup after collision pass
    }
}
```

## Physics Math Utilities

The `PhysicsMath` class provides physics calculations:

```java
import com.hypixel.hytale.server.core.modules.physics.util.PhysicsMath;

public class PhysicsMath {
    // Medium densities (kg/m^3)
    public static final double DENSITY_AIR = 1.2;
    public static final double DENSITY_WATER = 998.0;
    public static final double AIR_DENSITY = 0.001225;

    // Calculate acceleration with drag
    public static double getAcceleration(double speed, double terminalSpeed) {
        double ratio = Math.abs(speed / terminalSpeed);
        return 32.0 * (1.0 - ratio * ratio * ratio);
    }

    // Calculate terminal velocity
    public static double getTerminalVelocity(double mass, double density,
                                              double area, double dragCoefficient) {
        double massGrams = mass * 1000.0;
        double areaMeters = area * 1000000.0;
        return Math.sqrt(64.0 * massGrams / (density * areaMeters * dragCoefficient));
    }

    // Compute drag coefficient from terminal velocity
    public static double computeDragCoefficient(double terminalSpeed, double area,
                                                 double mass, double gravity) {
        return mass * gravity / (area * terminalSpeed * terminalSpeed);
    }

    // Calculate projected area of box in velocity direction
    public static double computeProjectedArea(Vector3d direction, Box box) {
        double area = 0.0;
        if (direction.x != 0.0) area += Math.abs(direction.x) * box.depth() * box.height();
        if (direction.y != 0.0) area += Math.abs(direction.y) * box.depth() * box.width();
        if (direction.z != 0.0) area += Math.abs(direction.z) * box.width() * box.height();
        return area;
    }

    // Calculate volume of intersection between two boxes
    public static double volumeOfIntersection(Box a, Vector3d posA, Box b, Vector3d posB) {
        return lengthOfIntersection(a.min.x, a.max.x, posB.x - posA.x + b.min.x, posB.x - posA.x + b.max.x)
             * lengthOfIntersection(a.min.y, a.max.y, posB.y - posA.y + b.min.y, posB.y - posA.y + b.max.y)
             * lengthOfIntersection(a.min.z, a.max.z, posB.z - posA.z + b.min.z, posB.z - posA.z + b.max.z);
    }
}
```

## Projectile Physics Configuration

The `StandardPhysicsConfig` provides comprehensive projectile physics settings:

```java
import com.hypixel.hytale.server.core.modules.projectile.config.StandardPhysicsConfig;

public class StandardPhysicsConfig implements PhysicsConfig {
    protected double density = 700.0;              // Object density
    protected double gravity;                       // Gravity strength
    protected double bounciness;                    // Bounce factor (0-1)
    protected int bounceCount = -1;                 // Max bounces (-1 = unlimited)
    protected double bounceLimit = 0.4;             // Min velocity to bounce
    protected boolean sticksVertically;             // Stick on vertical surfaces
    protected boolean computeYaw = true;            // Rotate with velocity
    protected boolean computePitch = true;          // Pitch with velocity
    protected RotationMode rotationMode = RotationMode.VelocityDamped;
    protected boolean allowRolling = false;         // Enable rolling physics
    protected double rollingFrictionFactor = 0.99;  // Rolling friction
    protected float rollingSpeed = 0.1f;            // Rolling animation speed
    protected double moveOutOfSolidSpeed;           // Speed to escape solids
    protected double terminalVelocityAir = 1.0;     // Terminal velocity in air
    protected double densityAir = 1.2;              // Air density
    protected double terminalVelocityWater = 1.0;   // Terminal velocity in water
    protected double densityWater = 998.0;          // Water density
    protected double hitWaterImpulseLoss = 0.2;     // Velocity loss on water entry
    protected double rotationForce = 3.0;           // Rotation damping force
    protected float speedRotationFactor = 2.0f;     // Rotation speed multiplier
    protected double swimmingDampingFactor = 1.0;   // Swimming movement damping
}
```

## Implementing Custom Physics

### Custom Force Provider

Create a custom force provider for special physics effects:

```java
import com.hypixel.hytale.server.core.modules.physics.util.ForceProvider;
import com.hypixel.hytale.server.core.modules.physics.util.ForceAccumulator;
import com.hypixel.hytale.server.core.modules.physics.util.PhysicsBodyState;

public class WindForceProvider implements ForceProvider {
    private final Vector3d windDirection;
    private final double windStrength;

    public WindForceProvider(Vector3d direction, double strength) {
        this.windDirection = direction.clone().normalize();
        this.windStrength = strength;
    }

    @Override
    public void update(PhysicsBodyState state, ForceAccumulator accumulator, boolean onGround) {
        // Wind only affects airborne entities
        if (!onGround) {
            accumulator.force.addScaled(windDirection, windStrength);
        }
    }
}
```

### Custom Physics System

Create a system that applies custom physics:

```java
import com.hypixel.hytale.component.system.tick.EntityTickingSystem;
import com.hypixel.hytale.server.core.modules.physics.util.*;

public class CustomPhysicsSystem extends EntityTickingSystem<EntityStore> {
    private final PhysicsBodyStateUpdater updater = new PhysicsBodyStateUpdaterSymplecticEuler();
    private final PhysicsBodyState stateBefore = new PhysicsBodyState();
    private final PhysicsBodyState stateAfter = new PhysicsBodyState();

    private final ForceProvider[] forceProviders;

    public CustomPhysicsSystem() {
        // Setup force providers
        ForceProviderEntity entityForces = new ForceProviderEntity(boundingBox);
        WindForceProvider wind = new WindForceProvider(new Vector3d(1, 0, 0), 5.0);
        forceProviders = new ForceProvider[] { entityForces, wind };
    }

    @Override
    public void tick(float dt, int index, ArchetypeChunk<EntityStore> chunk,
                     Store<EntityStore> store, CommandBuffer<EntityStore> buffer) {
        TransformComponent transform = chunk.getComponent(index, transformType);
        Velocity velocity = chunk.getComponent(index, velocityType);
        PhysicsValues physics = chunk.getComponent(index, physicsType);

        // Setup state
        stateBefore.position.assign(transform.getPosition());
        velocity.assignVelocityTo(stateBefore.velocity);

        double mass = physics.getMass();
        boolean onGround = /* collision check */;

        // Run physics simulation
        updater.update(stateBefore, stateAfter, mass, dt, onGround, forceProviders);

        // Apply results
        transform.setPosition(stateAfter.position);
        velocity.set(stateAfter.velocity);
    }
}
```

## Best Practices

1. **Choose the right integrator** - Use Symplectic Euler for most cases, RK4 for precise trajectories
2. **Clamp velocities** - Prevent numerical instability with `MIN_VELOCITY` threshold
3. **Use force accumulation** - Let `ForceAccumulator` handle force clipping
4. **Respect resistance limits** - Don't apply forces that would reverse velocity direction
5. **Handle ground state** - Switch between gravity and friction based on `onGround`
6. **Consider buoyancy** - Track displaced mass for fluid interactions
7. **Cache physics objects** - Reuse `PhysicsBodyState` instances to avoid allocation
8. **Use collision iterators** - For long-distance movement, use iterative collision detection
9. **Track trigger blocks** - Maintain trigger state across ticks for enter/exit events
10. **Separate physics from rendering** - Physics runs at fixed timestep, interpolate for display
