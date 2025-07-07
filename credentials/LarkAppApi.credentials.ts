import {
    INodeProperties,
    ICredentialType,
} from 'n8n-workflow';

export class LarkAppApi implements ICredentialType { 
    name = 'larkAppApi';
    displayName = 'Lark App API';
    documentationUrl = 'https://open.larksuite.com/document/home'
    properties: INodeProperties[] = [
        {
            displayName: 'App ID',
            name: 'app_id',
            type: 'string',
            default: '',
            description: 'The App ID from your Lark Open Platform application',
        },
        {
            displayName: 'App Secret',
            name: 'app_secret',
            type: 'string',
            default: '',
            typeOptions: {
                password: true,
            },
            description: 'The App Secret from your Lark Open Platform application',
        },
        {
            displayName: "App Token (Base)",
            name: 'app_token',
            type: 'string',
            default: '',
            description: 'The App Token of your Lark Base application',
        },
        {
            displayName: "Table ID",
            name: 'table_id',
            type: 'string',
            default: '',
            description: 'The Table ID within your Lark Base application',
        },
    ];
}