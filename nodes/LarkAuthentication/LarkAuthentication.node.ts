import {
    INodeType,
    INodeTypeDescription,
    IExecuteFunctions,
    INodeExecutionData,
    NodeConnectionType,
} from 'n8n-workflow';

export class LarkAuthentication implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Lark Authentication',
        name: 'larkAuthentication',
        icon: 'file:logo.png',
        group: ['applications'],
        version: 1,
        description: 'Obtain tenant_access_token from Lark Open Platform.',
        defaults: {
            name: 'Lark Authentication',
        },
        inputs: [NodeConnectionType.Main],
        outputs: [NodeConnectionType.Main],
        credentials: [
            {
                name: 'LarkAppApi',
                required: true,
            },
        ],
        properties: [],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const returnData: INodeExecutionData[] = [];

        const credentials = await this.getCredentials('LarkAppApi') as {
            app_id: string;
            app_secret: string;
        };

        try {
            const response = await this.helpers.httpRequest({
                method: 'POST',
                url: 'https://open.larksuite.com/open-apis/auth/v3/tenant_access_token/internal',
                body: {
                    app_id: credentials.app_id,
                    app_secret: credentials.app_secret,
                },
                json: true,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });

            if (response.code === 0 && response.tenant_access_token) {
                returnData.push({
                    json: {
                        tenantAccessToken: response.tenant_access_token,
                    },
                });
            } else {
                throw new Error(`Failed to get tenant_access_token: ${response.msg || 'Unknown error'}`);
            }
        } catch (error) {
            this.logger.error(`Error getting tenant_access_token: ${error.message}`);
            throw error;
        }

        return this.prepareOutputData(returnData);
    }
}