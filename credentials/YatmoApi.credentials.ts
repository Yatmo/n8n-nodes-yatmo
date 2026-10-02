import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

const COUNTRIES = [
	'AL', 'AT', 'AU', 'BA', 'BE', 'BG', 'CA', 'CH', 'CY', 'DE', 'ES', 'FR', 'GR', 'HR', 'IE', 'IT', 'LU', 'MA', 'ME',
	'MT', 'NL', 'PT', 'RS', 'SI', 'UK',
];

export class YatmoApi implements ICredentialType {
	name = 'yatmoApi';

	displayName = 'Yatmo API';

	icon: Icon = { light: 'file:../nodes/Yatmo/yatmo.svg', dark: 'file:../nodes/Yatmo/yatmo.dark.svg' };

	documentationUrl = 'https://documentation.yatmo.com/license';

	properties: INodeProperties[] = [
		{
			displayName: 'Backend Licence Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description: 'Your Yatmo backend key (server to server), from https://yatmo.com',
		},
		{
			displayName: 'Country',
			name: 'country',
			type: 'options',
			options: COUNTRIES.map((code) => ({ name: code, value: code })),
			default: 'BE',
			description: 'Country of your properties; the licence must cover it',
		},
		{
			displayName: 'Language',
			name: 'language',
			type: 'string',
			default: 'EN',
			description: 'Default language of labels and texts (EN, FR, NL, DE...); each node can override it',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				LicenseKey: '={{$credentials.apiKey}}',
				'X-Yatmo-SDK': 'yatmo-n8n/1.0.0',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '=https://{{$credentials.country.toLowerCase()}}.yatmo.com',
			url: '/SimplifiedCategories',
			qs: { language: 'EN' },
			method: 'GET',
		},
	};
}
