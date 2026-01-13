// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	integrations: [
		starlight({
			title: 'Hytale Server Docs (Unofficial)',
			description: 'Unofficial community documentation for running and modding Hytale servers',
			defaultLocale: 'en',
			customCss: ['./src/styles/custom.css'],
			social: [
				{ icon: 'github', label: 'GitHub', href: 'https://github.com/vulpeslab/hytale-docs' },
				{ icon: 'discord', label: 'Discord', href: 'https://discord.gg/jshWA2kRmF' },
			],
			sidebar: [
				{
					label: 'Getting Started',
					items: [
						{ label: 'Introduction', slug: 'getting-started/introduction' },
						{ label: 'Installation', slug: 'getting-started/installation' },
					],
				},
				{
					label: 'Server Configuration',
					items: [
						{ label: 'Overview', slug: 'server' },
						{ label: 'Server Settings', slug: 'server/server-config' },
						{ label: 'World Configuration', slug: 'server/world-config' },
						{ label: 'Authentication', slug: 'server/authentication' },
						{ label: 'Performance Tuning', slug: 'server/performance' },
						{ label: 'Running as a Service', slug: 'server/service' },
						{ label: 'Backups', slug: 'server/backups' },
					],
				},
				{
					label: 'Plugin Development',
					items: [
						{ label: 'Overview', slug: 'modding/overview' },
						{
							label: 'Core Systems',
							items: [
								{ label: 'Plugin System', slug: 'modding/plugins/plugin-system' },
								{ label: 'Event System', slug: 'modding/plugins/events' },
								{ label: 'Commands', slug: 'modding/plugins/commands' },
								{ label: 'Permissions', slug: 'modding/plugins/permissions' },
								{ label: 'Task Scheduling', slug: 'modding/plugins/tasks' },
							],
						},
						{
							label: 'Entity System (ECS)',
							items: [
								{ label: 'Overview', slug: 'modding/ecs' },
								{ label: 'Components', slug: 'modding/ecs/components' },
								{ label: 'Entity Stats', slug: 'modding/ecs/entity-stats' },
								{ label: 'Physics', slug: 'modding/ecs/physics' },
								{ label: 'Player Persistence', slug: 'modding/ecs/player-persistence' },
								{
									label: 'Core Systems',
									items: [
										{ label: 'Damage System', slug: 'modding/ecs/systems/damage' },
										{ label: 'Movement & Locomotion', slug: 'modding/ecs/systems/movement' },
										{ label: 'Mounts System', slug: 'modding/ecs/systems/mounts' },
									],
								},
							],
						},
						{
							label: 'Content & World',
							items: [
								{ label: 'Overview', slug: 'modding/content' },
								{ label: 'Assets & Registry', slug: 'modding/content/assets' },
								{ label: 'Inventory & Items', slug: 'modding/content/inventory' },
								{ label: 'Prefabs', slug: 'modding/content/prefabs' },
								{ label: 'World Generation', slug: 'modding/content/world-generation' },
							],
						},
						{
							label: 'Networking',
							items: [
								{ label: 'Overview', slug: 'modding/networking' },
								{ label: 'Protocol & Packets', slug: 'modding/networking/protocol' },
							],
						},
						{ label: 'Examples', slug: 'modding/examples' },
					],
				},
				{
					label: 'GUI System',
					items: [
						{ label: 'Overview', slug: 'gui' },
						{ label: 'Windows', slug: 'gui/windows' },
						{ label: 'Custom Pages', slug: 'gui/pages' },
						{ label: 'HUD System', slug: 'gui/hud' },
						{ label: 'UI Building Tools', slug: 'gui/builders' },
					],
				},
			],
			head: [
				{
					tag: 'meta',
					attrs: {
						name: 'theme-color',
						content: '#ff9900',
					},
				},
			],
		}),
	],
});
