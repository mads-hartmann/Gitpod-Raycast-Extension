import { Detail } from "@raycast/api";

import View from "./View";

export default function WorkspaceInfo(props: { workspaceId: string}) {
    const workspace = {
        id: "madshartman-gitpoddotfi-hpri241vmcb",
        repository: "mads-hartmann/gitpod-dotfiles",
        branch: "main",
    }
  const markdown = `
    workspace status: preparing
    workspace status: pending
    workspace status: creating
    workspace status: initializing
    workspace running
  `;
  return (
    <View>
      <Detail
        markdown={markdown}
        isLoading={false}
        navigationTitle="Workspace Info"
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.Label title="Id" text={workspace.id} />
            <Detail.Metadata.Label title="Repository" text={workspace.repository} />
            <Detail.Metadata.Label title="Branch" text={workspace.branch} />
            <Detail.Metadata.TagList title="Workspace class">
              <Detail.Metadata.TagList.Item text="Standard" color={"#eed535"} />
            </Detail.Metadata.TagList>
            <Detail.Metadata.Separator />
            <Detail.Metadata.Link title="Open in browser" target={`https://${workspace.id}.ws.dogfood.gitpod.cloud`} text="Open in browser" />
          </Detail.Metadata>
        }
      />
    </View>
  );
}
