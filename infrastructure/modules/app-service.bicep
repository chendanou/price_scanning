@description('Azure region for resources')
param location string

@description('Application name')
param appName string

@description('Environment name')
param environment string

// Note: F1 (Free) tier doesn't support Playwright's system dependencies
// Using B1 (Basic) for all environments to support browser automation
var skuName = 'B1'
var skuTier = 'Basic'

resource appServicePlan 'Microsoft.Web/serverfarms@2022-09-01' = {
  name: '${appName}-plan'
  location: location
  sku: {
    name: skuName
    tier: skuTier
  }
  kind: 'linux'
  properties: {
    reserved: true
  }
}

resource webApp 'Microsoft.Web/sites@2022-09-01' = {
  name: appName
  location: location
  properties: {
    serverFarmId: appServicePlan.id
    siteConfig: {
      linuxFxVersion: 'NODE|20-lts'
      appSettings: [
        {
          name: 'NODE_ENV'
          value: environment == 'dev' ? 'development' : 'production'
        }
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~20'
        }
        {
          name: 'SCM_DO_BUILD_DURING_DEPLOYMENT'
          value: 'true'
        }
        {
          name: 'WEBSITE_RUN_FROM_PACKAGE'
          value: '1'
        }
      ]
      alwaysOn: environment != 'dev'
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      http20Enabled: true
    }
    httpsOnly: true
  }
}

output appUrl string = 'https://${webApp.properties.defaultHostName}'
output appName string = webApp.name
output appId string = webApp.id
