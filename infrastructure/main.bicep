@description('Environment name (dev, uat, or prod)')
@allowed([
  'dev'
  'uat'
  'prod'
])
param environment string

@description('Azure region for resources')
param location string = 'australiaeast'

@description('Application name prefix')
param appName string = 'price-survey'

@description('Container image to deploy')
param containerImage string

@description('Azure Search key')
@secure()
param searchKey string

@description('Azure OpenAI endpoint')
param openaiEndpoint string

@description('Azure OpenAI key')
@secure()
param openaiKey string

var uniqueSuffix = uniqueString(resourceGroup().id)
var resourcePrefix = '${appName}-${environment}-${uniqueSuffix}'

// Deploy Container App
module containerApp 'modules/container-app.bicep' = {
  name: 'containerAppDeployment'
  params: {
    location: location
    appName: resourcePrefix
    environment: environment
    containerImage: containerImage
    searchEndpoint: aiSearch.outputs.searchEndpoint
    searchKey: searchKey
    openaiEndpoint: openaiEndpoint
    openaiKey: openaiKey
  }
}

// Deploy Azure AI Search
module aiSearch 'modules/ai-search.bicep' = {
  name: 'aiSearchDeployment'
  params: {
    location: location
    searchServiceName: '${appName}-search-${environment}-${uniqueSuffix}'
    sku: environment == 'dev' ? 'free' : 'basic'
  }
}

// Deploy Storage Account (optional)
module storage 'modules/storage.bicep' = {
  name: 'storageDeployment'
  params: {
    location: location
    storageAccountName: 'ps${environment}${uniqueSuffix}'
  }
}

output webAppUrl string = containerApp.outputs.appUrl
output webAppName string = containerApp.outputs.appName
output searchEndpoint string = aiSearch.outputs.searchEndpoint
output searchServiceName string = aiSearch.outputs.searchServiceName
output storageAccountName string = storage.outputs.storageAccountName
