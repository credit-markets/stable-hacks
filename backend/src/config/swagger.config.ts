import { DocumentBuilder, SwaggerCustomOptions } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

export const createSwaggerConfig = (configService: ConfigService) => {
  const builder = new DocumentBuilder()
    .setTitle('Credit Markets API')
    .setDescription(
      `
    # Credit Markets API v1.0

    ## 🚀 Overview
    The Credit Markets API enables decentralized credit market operations with comprehensive pool management, investment tracking, and portfolio analytics.

    ## 🔐 Authentication
    This API uses **JWT Bearer tokens** for authentication via Dynamic SDK.

    ### Dynamic SDK Authentication
    1. **Frontend Authentication**: Users authenticate via Dynamic SDK (Google OAuth or MetaMask)
    2. **JWT Token**: Dynamic SDK provides a JWT token containing wallet credentials
    3. **Backend Validation**: Include the Dynamic JWT in the Authorization header: \`Bearer {token}\`

    Click the **Authorize** button above to add your JWT token for testing authenticated endpoints.

    ## 📊 Response Formats
    All responses follow a consistent JSON structure:
    
    **Success Response:**
    \`\`\`json
    {
      "success": true,
      "data": { ... },
      "message": "Operation successful"
    }
    \`\`\`
    
    **Error Response:**
    \`\`\`json
    {
      "statusCode": 400,
      "message": "Error description",
      "error": "Bad Request"
    }
    \`\`\`

    ## 🎯 Rate Limiting
    - **Default**: 100 requests/minute per IP
    - **Authenticated**: 200 requests/minute
    - Headers: \`X-RateLimit-Limit\`, \`X-RateLimit-Remaining\`, \`X-RateLimit-Reset\`

    ## 📝 Pagination
    Use query parameters for paginated endpoints:
    - \`page\`: Page number (default: 1)
    - \`limit\`: Items per page (default: 10, max: 100)
    - \`sort\`: Sort field
    - \`order\`: Sort order (asc/desc)

    ## 🔍 Filtering
    - Nested fields: \`?filter.status=ACTIVE\`
    - Multiple values: \`?status=ACTIVE,PENDING\`
    - Range: \`?amount[gte]=1000&amount[lte]=10000\`
    - Search: \`?search=keyword\`

    ## 📁 File Uploads
    Some endpoints support file uploads using \`multipart/form-data\`:
    - Max size: 10MB
    - Images: jpg, jpeg, png, gif, webp
    - Documents: pdf, doc, docx

    ## 🏷️ API Tags
    Endpoints are organized by functional area. Click on a tag below to explore related endpoints.
  `,
    )
    .setVersion('1.0.0')
    .setContact(
      'Credit Markets Support',
      'https://credit.markets',
      'support@credit.markets',
    )
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .setTermsOfService('https://credit.markets/terms')
    .setExternalDoc('Full Documentation', 'https://docs.credit.markets')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token obtained from /auth endpoints',
        in: 'header',
      },
      'JWT-auth',
    )
    .addApiKey(
      {
        type: 'apiKey',
        name: 'X-API-Key',
        in: 'header',
        description: 'API Key for service-to-service authentication',
      },
      'API-Key',
    )
    .addGlobalParameters({
      name: 'X-Request-ID',
      in: 'header',
      required: false,
      description: 'Unique request ID for tracking and debugging',
      schema: {
        type: 'string',
        format: 'uuid',
        example: '550e8400-e29b-41d4-a716-446655440000',
      },
    })
    .addTag('auth', '🔐 Authentication - Dynamic SDK JWT validation')
    .addTag('users', '👤 Users - User profiles and wallet management')
    .addTag('pools', '🏊 Pools - Credit pool creation and management')
    .addTag(
      'Nota Fiscal Items',
      '📦 Nota Fiscal Items - TIDC receivables within pools',
    )
    .addTag('managers', '🏢 Managers - Manager profiles')
    .addTag('portfolio', '💼 Portfolio - Investment tracking and analytics')
    .addTag('marketplace', '📊 Marketplace - Market data and statistics')
    .addTag('health', '❤️ Health - API health and status checks');

  // Add servers based on environment configuration
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  const port = configService.get<number>('PORT', 3030);

  // Allow custom server URLs or use sensible defaults
  const productionUrl = configService.get<string>(
    'SWAGGER_PRODUCTION_URL',
    'https://api.credit.markets',
  );
  const stagingUrl = configService.get<string>(
    'SWAGGER_STAGING_URL',
    'https://staging-api.credit.markets',
  );
  const localUrl = configService.get<string>(
    'SWAGGER_LOCAL_URL',
    `http://localhost:${port}`,
  );

  // Add servers based on environment
  if (nodeEnv === 'production' && productionUrl) {
    builder.addServer(productionUrl, 'Production');
  } else if (nodeEnv === 'staging' && stagingUrl) {
    builder.addServer(stagingUrl, 'Staging');
  } else {
    // In development or when not specified, show all servers
    if (productionUrl) {
      builder.addServer(productionUrl, 'Production');
    }
    if (stagingUrl) {
      builder.addServer(stagingUrl, 'Staging');
    }
    builder.addServer(localUrl, 'Local Development');
  }

  return builder.build();
};

export const swaggerCustomOptions: SwaggerCustomOptions = {
  swaggerOptions: {
    persistAuthorization: true,
    docExpansion: 'none',
    filter: true,
    showRequestDuration: true,
    syntaxHighlight: {
      activate: true,
      theme: 'monokai',
    },
    tryItOutEnabled: true,
    displayRequestDuration: true,
    defaultModelsExpandDepth: 1,
    defaultModelExpandDepth: 2,
    displayOperationId: false,
    tagsSorter: 'alpha',
    operationsSorter: 'alpha',
  },
  customCss: `
    .swagger-ui .topbar { 
      display: none; 
    }
    .swagger-ui .info {
      margin-bottom: 40px;
    }
    .swagger-ui .info .title {
      color: #122755;
    }
    .swagger-ui .scheme-container {
      background: #f5f5f5;
      padding: 15px;
      border-radius: 4px;
    }
    .swagger-ui .btn.authorize {
      background-color: #122755;
      border-color: #122755;
    }
    .swagger-ui .btn.authorize:hover {
      background-color: #0a1a3d;
      border-color: #0a1a3d;
    }
    .swagger-ui .opblock.opblock-post .opblock-summary-method {
      background: #49cc90;
    }
    .swagger-ui .opblock.opblock-get .opblock-summary-method {
      background: #61affe;
    }
    .swagger-ui .opblock.opblock-patch .opblock-summary-method {
      background: #50e3c2;
    }
    .swagger-ui .opblock.opblock-delete .opblock-summary-method {
      background: #f93e3e;
    }
    .swagger-ui .opblock.opblock-put .opblock-summary-method {
      background: #fca130;
    }
    .swagger-ui select {
      padding: 5px 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
  `,
  customSiteTitle: 'Credit Markets API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerUrl: '/api',
  // customJs: ['/swagger-custom.js'], // Commented out as file doesn't exist
};
