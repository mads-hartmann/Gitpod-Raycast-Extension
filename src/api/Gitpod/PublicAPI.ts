import fetch from "node-fetch";

import { getPublicAPIEndpoint } from "../../preferences/gitpod_endpoint";

type CreateAndStartParams = {
  contextUrl: string;
  organizationId: string;
  startSpec: {
    workspaceClass: string;
    ideSettings: {
      defaultIde: string;
      useLatestVersion: false;
    };
    ignoreRunningWorkspaceOnSameCommit: boolean;
    ignoreRunningPrebuild: boolean;
  };
};

export class PublicAPI {
  private token: string;
  private endpoint: string;

  constructor(params: { token: string }) {
    this.token = params.token;
    this.endpoint = getPublicAPIEndpoint();
  }

  public async createAndStartWorkspace(params: CreateAndStartParams): Promise<string> {
    const response = await fetch(`${this.endpoint}/gitpod.experimental.v1.WorkspacesService/CreateAndStartWorkspace`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify(params),
    });

    if (response.status != 200) {
      const error = {
        name: "WorkspaceCreateAndStartError",
        code: response.status,
        message: response.statusText,
      };
      throw error;
    }

    const json: any = await response.json();

    return json.workspaceId;
  }
}
