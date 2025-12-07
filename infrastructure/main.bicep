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

var uniqueSuffix = uniqueString(resourceGroup().id)
var resourcePrefix = '${appName}-${environment}-${uniqueSuffix}'

// Deploy App Service
module appService 'modules/app-service.bicep' = {
  name: 'appServiceDeployment'
  params: {
    location: location
    appName: resourcePrefix
    environment: environment
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
    storageAccountName: replace('${appName}${environment}${uniqueSuffix}', '-', '')
  }
}

output webAppUrl string = appService.outputs.appUrl
output webAppName string = appService.outputs.appName
output searchEndpoint string = aiSearch.outputs.searchEndpoint
output searchServiceName string = aiSearch.outputs.searchServiceName
output storageAccountName string = storage.outputs.storageAccountName
