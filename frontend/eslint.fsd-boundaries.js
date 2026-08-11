import boundaries from 'eslint-plugin-boundaries';

/** FSD layers from highest to lowest. @see https://feature-sliced.design/docs/reference/layers/overview */
const FS_LAYERS = ['app', 'pages', 'widgets', 'features', 'entities', 'shared'];

const SLICE_LAYERS = ['pages', 'widgets', 'features', 'entities'];
const SEGMENT_LAYERS = ['app', 'shared'];

const getLowerLayers = (layer) => FS_LAYERS.slice(FS_LAYERS.indexOf(layer) + 1);

const fsdElements = [
	...SLICE_LAYERS.flatMap((layer) => [
		{
			type: layer,
			pattern: `src/${layer}/!(_*)`,
			partialMatch: false,
			capture: ['slice'],
		},
		{
			type: `gm_${layer}`,
			pattern: `src/${layer}/_*`,
			partialMatch: false,
			capture: ['slice'],
		},
	]),
	...SEGMENT_LAYERS.flatMap((layer) => [
		{
			type: layer,
			pattern: `src/${layer}`,
			partialMatch: false,
		},
		{
			type: `gm_${layer}`,
			pattern: `src/${layer}/_*`,
			partialMatch: false,
		},
	]),
];

const upperLayers = FS_LAYERS.slice(0, FS_LAYERS.indexOf('shared'));

const layerImportPolicies = upperLayers.map((layer) => ({
	from: { element: { type: layer } },
	allow: { to: { element: { types: getLowerLayers(layer) } } },
}));

const slicelessLayerPolicies = [
	{
		from: { element: { type: 'shared' } },
		allow: { to: { element: { type: 'shared' } } },
	},
	{
		from: { element: { type: 'app' } },
		allow: { to: { element: { type: 'app' } } },
	},
];

const godModePolicies = FS_LAYERS.map((layer) => ({
	from: { element: { type: `gm_${layer}` } },
	allow: { to: { element: { types: [layer, ...getLowerLayers(layer)] } } },
}));

export const fsdBoundariesConfig = {
	plugins: {
		boundaries,
	},
	settings: {
		'import/resolver': {
			typescript: {
				project: './tsconfig.app.json',
				alwaysTryTypes: true,
			},
		},
		'boundaries/elements': fsdElements,
		'boundaries/include': ['src/**'],
		'boundaries/ignore': ['src/main.tsx'],
	},
	rules: {
		...boundaries.configs.recommended.rules,
		'boundaries/dependencies': [
			'error',
			{
				default: 'disallow',
				message:
					'"{{from.element.types.[0]}}" is not allowed to import "{{to.element.types.[0]}}" | FSD: https://feature-sliced.design/docs/reference/layers/overview',
				policies: [
					{
						allow: { dependency: { relationship: { to: 'internal' } } },
					},
					...layerImportPolicies,
					...slicelessLayerPolicies,
					...godModePolicies,
				],
			},
		],
	},
};
