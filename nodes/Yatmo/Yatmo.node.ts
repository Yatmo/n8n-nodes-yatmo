import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestOptions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { renderHtml, renderMarkdown, renderPlain, resolveText } from './text';

const TRAVEL_MODES = [
	{ name: 'Walking', value: 'Walking' },
	{ name: 'Bicycling', value: 'Bicycling' },
	{ name: 'Driving', value: 'Driving' },
	{ name: 'Public Transport', value: 'Transit' },
];

const PARAGRAPHS = [
	{ name: 'Education', value: 'education' },
	{ name: 'Shopping', value: 'shopping' },
	{ name: 'Public Transport', value: 'publictransports' },
	{ name: 'Roads, Stations and Airports', value: 'transports' },
	{ name: 'Leisure and Tourism', value: 'tourism' },
	{ name: 'Nearby Cities', value: 'cities' },
];

const POSITION_OPERATIONS = ['summary', 'text', 'enrichment', 'scores', 'isochrones', 'staticMap'];

export class Yatmo implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Yatmo',
		name: 'yatmo',
		icon: { light: 'file:yatmo.svg', dark: 'file:yatmo.dark.svg' },
		group: ['input'],
		version: [1],
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description:
			'Real estate neighbourhood data: nearest places with travel times, neighbourhood text, scores, geocoding, isochrones, routes and static maps from Yatmo',
		defaults: {
			name: 'Yatmo',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'yatmoApi', required: true }],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Address', value: 'address' },
					{ name: 'Property', value: 'property' },
					{ name: 'Travel', value: 'travel' },
				],
				default: 'property',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['property'] } },
				options: [
					{ name: 'Get Listing Enrichment', value: 'enrichment', action: 'Get listing enrichment', description: 'The nearest place of each category with distance and time by four travel modes, flat JSON to store and filter on' },
					{ name: 'Get Neighbourhood Summary', value: 'summary', action: 'Get the neighbourhood summary', description: 'Nearest school, nursery, supermarket, public transport and more with distances and travel times, closest cities and the resolved address' },
					{ name: 'Get Neighbourhood Text', value: 'text', action: 'Get the neighbourhood text', description: 'The description of the surroundings as paragraphs, plus HTML, Markdown and plain versions ready for a listing page' },
					{ name: 'Get Scores', value: 'scores', action: 'Get the scores', description: 'One 0 to 10 score per category' },
					{ name: 'Get Static Map', value: 'staticMap', action: 'Get a static map image', description: 'A JPEG of the map around the property, as binary data' },
				],
				default: 'text',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['address'] } },
				options: [
					{ name: 'Geocode', value: 'geocode', action: 'Geocode an address', description: 'An address to coordinates, inside the country' },
				],
				default: 'geocode',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['travel'] } },
				options: [
					{ name: 'Get Isochrones', value: 'isochrones', action: 'Get the isochrones', description: 'The areas reachable in 5, 10 and 20 minutes with a travel mode, as GeoJSON' },
					{ name: 'Get Route', value: 'route', action: 'Get a route', description: 'Distance, duration and geometry of the route between two points' },
				],
				default: 'isochrones',
			},
			{
				displayName: 'Location',
				name: 'locationMode',
				type: 'options',
				options: [
					{ name: 'Coordinates', value: 'coordinates' },
					{ name: 'Address (Geocoded by Yatmo)', value: 'address' },
				],
				default: 'coordinates',
				displayOptions: { show: { operation: POSITION_OPERATIONS } },
			},
			{
				displayName: 'Latitude',
				name: 'latitude',
				type: 'number',
				default: 0,
				typeOptions: { numberPrecision: 7 },
				displayOptions: { show: { operation: POSITION_OPERATIONS, locationMode: ['coordinates'] } },
				description: 'Latitude of the property, in decimal degrees',
			},
			{
				displayName: 'Longitude',
				name: 'longitude',
				type: 'number',
				default: 0,
				typeOptions: { numberPrecision: 7 },
				displayOptions: { show: { operation: POSITION_OPERATIONS, locationMode: ['coordinates'] } },
				description: 'Longitude of the property, in decimal degrees',
			},
			{
				displayName: 'Address',
				name: 'address',
				type: 'string',
				default: '',
				placeholder: 'Rue de la Loi 16, 1000 Bruxelles',
				displayOptions: { show: { operation: [...POSITION_OPERATIONS, 'geocode'] } },
				description: 'Street, postcode and city; located by Yatmo in the country of the credential',
			},
			{
				displayName: 'Travel Mode',
				name: 'travelMode',
				type: 'options',
				options: TRAVEL_MODES,
				default: 'Walking',
				displayOptions: { show: { operation: ['isochrones', 'route'] } },
			},
			{
				displayName: 'From Latitude',
				name: 'fromLatitude',
				type: 'number',
				default: 0,
				typeOptions: { numberPrecision: 7 },
				displayOptions: { show: { operation: ['route'] } },
			},
			{
				displayName: 'From Longitude',
				name: 'fromLongitude',
				type: 'number',
				default: 0,
				typeOptions: { numberPrecision: 7 },
				displayOptions: { show: { operation: ['route'] } },
			},
			{
				displayName: 'To Latitude',
				name: 'toLatitude',
				type: 'number',
				default: 0,
				typeOptions: { numberPrecision: 7 },
				displayOptions: { show: { operation: ['route'] } },
			},
			{
				displayName: 'To Longitude',
				name: 'toLongitude',
				type: 'number',
				default: 0,
				typeOptions: { numberPrecision: 7 },
				displayOptions: { show: { operation: ['route'] } },
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add option',
				default: {},
				options: [
					{
						displayName: 'Binary Property',
						name: 'binaryProperty',
						type: 'string',
						default: 'data',
						description: 'Name of the binary property holding the static map image',
					},
					{
						displayName: 'Image: Height',
						name: 'height',
						type: 'number',
						default: 450,
					},
					{
						displayName: 'Image: Map Style',
						name: 'mapStyle',
						type: 'options',
						options: [
							{ name: 'Liberty', value: 1 },
							{ name: 'Basic', value: 2 },
							{ name: 'Bright', value: 3 },
							{ name: '3D', value: 4 },
							{ name: 'Positron', value: 5 },
							{ name: 'Dark', value: 6 },
							{ name: 'Liberty Stonehedge', value: 7 },
						],
						default: 1,
					},
					{
						displayName: 'Image: Pin Colour',
						name: 'color',
						type: 'color',
						default: '#428BFF',
					},
					{
						displayName: 'Image: Width',
						name: 'width',
						type: 'number',
						default: 800,
					},
					{
						displayName: 'Language',
						name: 'language',
						type: 'string',
						default: '',
						description: 'Language of labels and texts (EN, FR, NL, DE...); empty = the credential language',
					},
					{
						displayName: 'Text: Heading Level',
						name: 'heading',
						type: 'options',
						options: [
							{ name: 'H2', value: 'h2' },
							{ name: 'H3', value: 'h3' },
							{ name: 'H4', value: 'h4' },
							{ name: 'None', value: '' },
						],
						default: 'h3',
					},
					{
						displayName: 'Text: Headings Name',
						name: 'titles',
						type: 'options',
						options: [
							{ name: 'The Street, Then the City', value: 'street-city' },
							{ name: 'The City Only (Discreet Listing)', value: 'city' },
							{ name: 'Neither', value: 'generic' },
						],
						default: 'street-city',
					},
					{
						displayName: 'Text: Paragraphs',
						name: 'paragraphs',
						type: 'multiOptions',
						options: PARAGRAPHS,
						default: [],
						description: 'Paragraphs to keep in the rendered text; none = all',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const out: INodeExecutionData[] = [];
		const credentials = (await this.getCredentials('yatmoApi')) as { apiKey: string; country: string; language: string };
		const baseURL = `https://${String(credentials.country).toLowerCase()}.yatmo.com`;

		const coordinate = (value: number) => Number(value).toFixed(7);

		const get = async (path: string, qs: IDataObject, json = true): Promise<unknown> => {
			const options: IHttpRequestOptions = { method: 'GET', url: `${baseURL}/${path}`, qs, json, headers: { Accept: json ? 'application/json' : 'image/jpeg' } };
			if (!json) options.encoding = 'arraybuffer';
			return this.helpers.httpRequestWithAuthentication.call(this, 'yatmoApi', options);
		};

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as string;
				const options = this.getNodeParameter('options', i, {}) as IDataObject;
				const language = String(options.language || credentials.language || 'EN').toUpperCase();

				const position = async (): Promise<{ latitude: string; longitude: string }> => {
					const mode = this.getNodeParameter('locationMode', i, 'coordinates') as string;
					if (mode === 'coordinates') {
						return { latitude: coordinate(this.getNodeParameter('latitude', i) as number), longitude: coordinate(this.getNodeParameter('longitude', i) as number) };
					}
					const address = (this.getNodeParameter('address', i, '') as string).trim();
					const found = (await get('geolocation', { address, language })) as IDataObject;
					const feature = ((found?.features as IDataObject[] | undefined) ?? [])[0];
					const coords = (feature?.geometry as IDataObject | undefined)?.coordinates as number[] | undefined;
					if (!coords || coords.length < 2) {
						throw new NodeOperationError(this.getNode(), `Yatmo did not find "${address}" in ${credentials.country}`, { itemIndex: i });
					}
					return { latitude: coordinate(coords[1]), longitude: coordinate(coords[0]) };
				};

				let json: IDataObject = {};
				let binary: INodeExecutionData['binary'];

				if (operation === 'summary') {
					json = (await get('summary', { ...(await position()), language })) as IDataObject;
				} else if (operation === 'text') {
					const pos = await position();
					const raw = (await get('Summary/text', { ...pos, language })) as IDataObject;
					const text = resolveText(raw, language);
					const render = {
						heading: options.heading === undefined ? 'h3' : (options.heading as string) || null,
						titles: (options.titles as 'street-city' | 'city' | 'generic' | undefined) ?? 'street-city',
						paragraphs: (options.paragraphs as string[] | undefined) ?? [],
					};
					json = {
						latitude: Number(pos.latitude),
						longitude: Number(pos.longitude),
						language: text.language,
						paragraphs: text.paragraphs as unknown as IDataObject[],
						html: renderHtml(text, render),
						markdown: renderMarkdown(text, render),
						plain: renderPlain(text, render),
					};
				} else if (operation === 'enrichment') {
					json = (await get('enrichment', { ...(await position()), language })) as IDataObject;
				} else if (operation === 'scores') {
					json = (await get('scores', { ...(await position()), language })) as IDataObject;
				} else if (operation === 'geocode') {
					const address = (this.getNodeParameter('address', i, '') as string).trim();
					const found = (await get('geolocation', { address, language })) as IDataObject;
					const features = (found?.features as IDataObject[] | undefined) ?? [];
					json = {
						address,
						places: features.map((f) => {
							const p = (f.properties as IDataObject | undefined) ?? {};
							const c = ((f.geometry as IDataObject | undefined)?.coordinates as number[] | undefined) ?? [];
							return { ...p, latitude: c[1], longitude: c[0] };
						}),
					};
				} else if (operation === 'isochrones') {
					const pos = await position();
					const areas = (await get('Isochrone/GetMultipleTimes', { ...pos, language, travelMode: this.getNodeParameter('travelMode', i) as string })) as IDataObject[];
					json = { latitude: Number(pos.latitude), longitude: Number(pos.longitude), isochrones: areas };
				} else if (operation === 'route') {
					json = (await get('route', {
						language,
						travelMode: this.getNodeParameter('travelMode', i) as string,
						startLatitude: coordinate(this.getNodeParameter('fromLatitude', i) as number),
						startLongitude: coordinate(this.getNodeParameter('fromLongitude', i) as number),
						arrivalLatitude: coordinate(this.getNodeParameter('toLatitude', i) as number),
						arrivalLongitude: coordinate(this.getNodeParameter('toLongitude', i) as number),
					})) as IDataObject;
				} else if (operation === 'staticMap') {
					const pos = await position();
					const image = (await get('image', {
						...pos,
						language,
						hexaColor: String(options.color ?? '#428BFF').replace('#', ''),
						width: String(options.width ?? 800),
						height: String(options.height ?? 450),
						mapStyle: String(options.mapStyle ?? 1),
					}, false)) as ArrayBuffer | Buffer;
					const buffer = Buffer.isBuffer(image) ? image : Buffer.from(image as ArrayBuffer);
					const property = String(options.binaryProperty || 'data');
					binary = { [property]: await this.helpers.prepareBinaryData(buffer, 'yatmo-map.jpg', 'image/jpeg') };
					json = { latitude: Number(pos.latitude), longitude: Number(pos.longitude) };
				} else {
					throw new NodeOperationError(this.getNode(), `Unknown operation "${operation}"`, { itemIndex: i });
				}

				out.push({ json, binary, pairedItem: { item: i } });
			} catch (error) {
				if (this.continueOnFail()) {
					out.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
					continue;
				}
				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
			}
		}

		return [out];
	}
}
