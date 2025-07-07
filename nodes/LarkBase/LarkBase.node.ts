import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeConnectionType
} from 'n8n-workflow';

export class LarkBase implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Lark Base',
        name: 'larkBase',
        icon: 'file:logo.svg',
        group: ['applications'],
        version: 1,
        description: 'Interact with Lark Base API to manage records',
        defaults: {
            name: 'Lark Base',
        },
        inputs: [NodeConnectionType.Main],
        outputs: [NodeConnectionType.Main],
        credentials: [
            {
                name: 'larkAppApi',
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
                    {
                        name: 'Create Record',
                        value: 'createRecord',
                        action: 'Create a new record in a Lark Base table',
                    },
                    {
                        name: 'Update Record',
                        value: 'updateRecord',
                        action: 'Update an existing record in a Lark Base table',
                    },
                    {
                        name: 'Delete Record',
                        value: 'deleteRecord',
                        action: 'Delete a record from a Lark Base table',
                    },
                ],
                default: 'getRecordList',
            },
            {
                displayName: 'Limit',
                name: 'limit',
                type: 'number',
                default: 50,
                description: 'Max number of results to return',
                displayOptions: {
                    show: {
                        operation: ['getRecordList'],
                    },
                },
            },
            {
                displayName: 'Fields (JSON)',
                name: 'fields',
                type: 'json',
                default: '{}',
                required: true,
                description: 'JSON object representing the fields and their values for the record. Example: {"FieldName": "Value"}',
                displayOptions: {
                    show: {
                        operation: ['createRecord', 'updateRecord'],
                    },
                },
            },
            {
                displayName: 'Record ID',
                name: 'recordId',
                type: 'string',
                default: '',
                required: true,
                description: 'The ID of the record to update or delete.',
                displayOptions: {
                    show: {
                        operation: ['updateRecord', 'deleteRecord'],
                    },
                },
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];

        const credentials = await this.getCredentials('larkAppApi') as {
            app_token: string;
            table_id: string;
        };

        const operation = this.getNodeParameter('operation', 0) as string;

        for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
            const currentItem = items[itemIndex];
            let responseData;

            const tenantAccessToken = currentItem.json.tenantAccessToken;
            if (!tenantAccessToken) {
                throw new Error('Tenant Access Token not found in input data. Please connect a "Lark Authentication" node before this node.');
            }

            try {
                if (operation === 'getRecordList') {
                    const limit = this.getNodeParameter('limit', itemIndex) as number;

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
                        throw new Error(`Failed to get records: ${response.msg || 'Unknown error'}. Details: ${JSON.stringify(response)}`);
                    }
                } else if (operation === 'createRecord') {
                    const fields = this.getNodeParameter('fields', itemIndex) as string;

                    let fieldsObj;
                    try {
                        fieldsObj = JSON.parse(fields);

                        if (!fieldsObj.fields && typeof fieldsObj === 'object') {
                            fieldsObj = { fields: fieldsObj };
                        }
                    } catch (error) {
                        throw new Error('Fields must be valid JSON format');
                    }

                    const response = await this.helpers.httpRequest({
                        method: 'POST',
                        url: `https://open.larksuite.com/open-apis/bitable/v1/apps/${credentials.app_token}/tables/${credentials.table_id}/records`,
                        body: fieldsObj,
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
                        throw new Error(`Failed to create record: ${response.msg || 'Unknown error'}. Details: ${JSON.stringify(response)}`);
                    }
                } else if (operation === 'updateRecord') {
                    const recordId = this.getNodeParameter('recordId', itemIndex) as string;
                    const fields = this.getNodeParameter('fields', itemIndex) as string;

                    let fieldsObj;
                    try {
                        fieldsObj = JSON.parse(fields);

                        if (!fieldsObj.fields && typeof fieldsObj === 'object') {
                            fieldsObj = { fields: fieldsObj };
                        }

                        if (!fieldsObj.fields || typeof fieldsObj.fields !== 'object') {
                            throw new Error('Invalid fields structure');
                        }
                    } catch (error) {
                        throw new Error(`Invalid fields format: ${error.message}`);
                    }

                    const response = await this.helpers.httpRequest({
                        method: 'PUT',
                        url: `https://open.larksuite.com/open-apis/bitable/v1/apps/${credentials.app_token}/tables/${credentials.table_id}/records/${recordId}`,
                        body: fieldsObj,
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
                        throw new Error(`Failed to update record: ${response.msg || 'Unknown error'}. Code: ${response.code}`);
                    }
                } else if (operation === 'deleteRecord') {
                    const recordId = this.getNodeParameter('recordId', itemIndex) as string;

                    if (!recordId || typeof recordId !== 'string' || recordId.trim() === '') {
                        throw new Error('Record ID must be a non-empty string');
                    }

                    try {
                        const response = await this.helpers.httpRequest({
                            method: 'DELETE',
                            url: `https://open.larksuite.com/open-apis/bitable/v1/apps/${credentials.app_token}/tables/${credentials.table_id}/records/${recordId}`,
                            json: true,
                            headers: {
                                'Authorization': `Bearer ${tenantAccessToken}`,
                                'Content-Type': 'application/json',
                                'Accept': 'application/json',
                            },
                        });

                        if (response.code === 0) {
                            responseData = {
                                success: true,
                                recordId: recordId,
                                message: response.msg || 'Record deleted successfully',
                                deletedAt: new Date().toISOString()
                            };
                        } else {
                            throw new Error(`Lark API Error [${response.code}]: ${response.msg}`);
                        }
                    } catch (error) {
                        if (error.response?.status === 404) {
                            throw new Error(`Record not found (ID: ${recordId})`);
                        }
                        throw new Error(`Failed to delete record: ${error.message}`);
                    }
                }
            } catch (error: any) {
                this.logger.error(`Error in Lark Base operation "${operation}": ${error.message}`);
                throw error;
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