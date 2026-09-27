import { MCP_RESOURCE_URL, OAUTH_ISSUER, oauthUrl } from "@/lib/mcp/oauth/constants";

export function authorizationServerMetadata() {
  return {
    issuer: OAUTH_ISSUER,
    authorization_endpoint: oauthUrl("authorize"),
    token_endpoint: oauthUrl("token"),
    registration_endpoint: oauthUrl("register"),
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported: ["mcp:tools"],
  };
}

export function protectedResourceMetadata() {
  return {
    resource: MCP_RESOURCE_URL,
    authorization_servers: [OAUTH_ISSUER],
    bearer_methods_supported: ["header"],
    scopes_supported: ["mcp:tools"],
  };
}

export function mcpUnauthorizedHeaders(): HeadersInit {
  return {
    "WWW-Authenticate": `Bearer resource_metadata="${OAUTH_ISSUER}/.well-known/oauth-protected-resource/api/mcp"`,
  };
}
