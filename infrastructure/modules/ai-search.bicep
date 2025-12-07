@description('Azure region for resources')
param location string

@description('Search service name')
param searchServiceName string

@description('SKU for AI Search service')
@allowed([
  'free'
  'basic'
  'standard'
])
param sku string = 'free'

resource searchService 'Microsoft.Search/searchServices@2023-11-01' = {
  name: searchServiceName
  location: location
  sku: {
    name: sku
  }
  properties: {
    replicaCount: 1
    partitionCount: 1
    hostingMode: 'default'
    semanticSearch: sku == 'free' ? 'disabled' : 'free'
    publicNetworkAccess: 'enabled'
  }
}

output searchEndpoint string = 'https://${searchService.name}.search.windows.net'
output searchServiceName string = searchService.name
output searchId string = searchService.id
