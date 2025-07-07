import {
    INodeType,
    INodeTypeDescription,
    IExecuteFunctions,
    INodeExecutionData,
    NodeConnectionType,
} from 'n8n-workflow';

export class LarkBase implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Lark Base',
        name: 'larkBase',
        icon: 'file:logo.png',
        group: ['applications'],
        version: 1,
        description: 'Interact with Lark Base API to get records.',
        defaults: {
            name: 'Lark Base',
        },
        inputs: [NodeConnectionType.Main],
        outputs: [NodeConnectionType.Main],
        credentials: [
            {
                name: 'LarkAppApi',
                required: true,
            },
        ],
        properties: [
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                noDataExpression: true,
                options: [
                    {
                        name: 'Get Record List',
                        value: 'getRecordList',
                        action: 'Get a list of records from a Lark Base table',
                    },
                ],
                default: 'getRecordList',
            },
            {
                displayName: 'Limit',
                name: 'limit',
                type: 'number',
                default: 100,
                description: 'Maximum number of records to return per request. Max is 500.',
                displayOptions: {
                    show: {
                        operation: ['getRecordList'],
                    },
                },
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];

        const credentials = await this.getCredentials('LarkAppApi') as {
            app_token: string;
            table_id: string;
        };

        const operation = this.getNodeParameter('operation', 0) as string;

        for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
            const currentItem = items[itemIndex];
            let responseData

            const tenantAccessToken = currentItem.json.tenantAccessToken
            if (!tenantAccessToken) {
                throw new Error('Tenant Access Token not found in input data. Please connect a "Lark Authentication" node before this node.');
            }

            if (operation === 'getRecordList') {
                const limit = this.getNodeParameter('limit', itemIndex) as number;

                try {
                    const response = await this.helpers.httpRequest({
                        method: 'GET',
                        url: `https://open.larksuite.com/open-apis/bitable/v1/apps/${credentials.app_token}/tables/${credentials.table_id}/records?page_size=${limit}`,
                        json: true,
                        headers: {
                            'Authorization': `Bearer ${tenantAccessToken}`,
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                        },
                    });

                    if (response.code === 0 && response.data) {
                        responseData = response.data;
                    } else {
                        throw new Error(`Failed to get records: ${response.msg || 'Unknown error'}`);
                    }
                } catch (error) {
                    this.logger.error(`Error getting record list: ${error.message}`);
                    throw error;
                }
            }

            if (responseData) {
                returnData.push({
                    json: responseData,
                });
            }
        }

        return this.prepareOutputData(returnData);
    }
}