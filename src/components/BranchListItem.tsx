import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  open,
  useNavigation,
  showToast,
  Toast,
  getPreferenceValues,
  LocalStorage,
  copyTextToClipboard,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";

import { branchStatus, GitpodIcons, UIColors } from "../../constants";
import { PublicAPI } from "../api/Gitpod/PublicAPI";
import { WorkspaceManager } from "../api/Gitpod/WorkspaceManager";
import { BranchDetailsFragment } from "../generated/graphql";
import createWorksapceFromContext from "../helpers/createWorkspaceFromContext";
import OpenInGitpod, { getPreferencesForContext } from "../helpers/openInGitpod";
import ContextPreferences from "../preferences/context_preferences";
import { dashboardPreferences } from "../preferences/dashboard_preferences";
import { Preferences as EditorPreferences } from "../preferences/repository_preferences";

import DefaultOrgForm from "./DefaultOrgForm";
import WorkspaceInfo from "./WorkspaceInfo";

type BranchItemProps = {
  branch: BranchDetailsFragment;
  mainBranch?: string;
  repository: string;
  visitBranch?: (branch: BranchDetailsFragment, repository: string) => void;
  removeBranch?: (branch: BranchDetailsFragment, repository: string) => void;
  fromCache?: boolean;
  repositoryWithoutOwner?: string;
  repositoryOwner?: string;
  repositoryLogo?: string;
  bodyVisible?: boolean;
  changeBodyVisibility?: (state: boolean) => void;
};

export default function BranchListItem({
  branch,
  repository,
  repositoryLogo,
  repositoryWithoutOwner,
  repositoryOwner,
  changeBodyVisibility,
  mainBranch,
  bodyVisible,
  visitBranch,
  fromCache,
  removeBranch,
}: BranchItemProps) {
  const accessories: List.Item.Accessory[] = [];
  const branchURL = "https://github.com/" + repository + "/tree/" + branch.branchName;

  const { data: preferences, revalidate } = usePromise(async () => {
    const response = await getPreferencesForContext("Branch", repository, branch.branchName);
    return response;
  });

  const editorPreferences = getPreferenceValues<EditorPreferences>();
  const dashboardPreferences = getPreferenceValues<dashboardPreferences>();
  const { push } = useNavigation();

  let icon = GitpodIcons.branchAhead;

  if (branch.compData) {
    if (branch.compData.status) {
      switch (branch.compData.status.toString()) {
        case branchStatus.ahead:
          accessories.unshift({
            text: bodyVisible ? branch.compData.aheadBy.toString() : "",
            icon: GitpodIcons.branchAhead,
          });
          icon = GitpodIcons.branchAhead;
          break;
        case branchStatus.behind:
          accessories.unshift({
            text: bodyVisible ? branch.compData.aheadBy.toString() : "",
            icon: GitpodIcons.branchBehind,
          });
          icon = GitpodIcons.branchBehind;
          break;
        case branchStatus.diverged:
          accessories.unshift({
            text: bodyVisible ? branch.compData.aheadBy.toString() : "",
            icon: GitpodIcons.branchDiverged,
          });
          icon = GitpodIcons.branchDiverged;
          break;
        case branchStatus.IDENTICAL:
          accessories.unshift({
            text: "IDN",
            icon: GitpodIcons.branchIdentical,
          });
          icon = GitpodIcons.branchIdentical;
          break;
      }
    }
  }

  accessories.unshift({
    text: {
      value: preferences?.preferredEditorClass === "g1-large" ? "L" : "S",
    },
    icon: {
      source: Icon.ComputerChip,
      tintColor: UIColors.gitpod_gold,
    },
    tooltip: `Editor: ${preferences?.preferredEditor}, Class: ${preferences?.preferredEditorClass} `,
  });
  if (branch.compData && branch.compData.commits && !bodyVisible) {
    accessories.unshift({
      tag: {
        value: branch.compData.commits.totalCount.toString(),
        color: Color.Yellow,
      },
      icon: GitpodIcons.commit_icon,
    });
  }

  return (
    <List.Item
      icon={GitpodIcons.branchIcon}
      subtitle={!bodyVisible ? (fromCache ? repository ?? "" : mainBranch) : ""}
      title={branch.branchName}
      accessories={accessories}
      detail={
        <List.Item.Detail
          markdown={`\n\n![RepositoryOwner](${repositoryLogo})\n# ${repositoryOwner}\n${repositoryWithoutOwner}`}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label
                title="Branch Name"
                icon={GitpodIcons.branchIcon}
                text={branch.branchName}
              />
              <List.Item.Detail.Metadata.Label title="Parent Branch" icon={GitpodIcons.branchIcon} text={mainBranch} />
              <List.Item.Detail.Metadata.Label
                title="Total Commits"
                icon={GitpodIcons.commit_icon}
                text={branch.compData ? branch.compData.commits.totalCount.toString() : "Failed To Load"}
              />
              {branch.compData && (
                <List.Item.Detail.Metadata.Label
                  title="Branch Status"
                  icon={icon}
                  text={branchStatus.IDENTICAL ? "IDN" : branch.compData.aheadBy.toString()}
                />
              )}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action
            title="Open Branch in Gitpod"
            onAction={async () => {
              visitBranch?.(branch, repository);
              if (dashboardPreferences.access_token) {
                const defaultOrg = await LocalStorage.getItem("default_organization");
                if (defaultOrg !== undefined && WorkspaceManager.api) {
                  const api = new PublicAPI({token: dashboardPreferences.access_token});
                  console.log(api, api.createAndStartWorkspace)
                  await showToast({
                    title: "Starting your workspace",
                    style: Toast.Style.Animated,
                  });
                  const workspaceID = await api.createAndStartWorkspace({
                    contextUrl: branchURL,
                    organizationId: defaultOrg.toString(),
                    startSpec: {
                      ignoreRunningPrebuild: true,
                      ignoreRunningWorkspaceOnSameCommit: true,
                      workspaceClass: editorPreferences.preferredEditorClass,
                      ideSettings: {
                        defaultIde: editorPreferences.preferredEditor === "ssh" ? "code" : editorPreferences.preferredEditor,
                        useLatestVersion: false,
                      },
                    }
                  });
                  await showToast({
                    title: `Created ${workspaceID}`,
                    style: Toast.Style.Success,
                  });
                  push(<WorkspaceInfo workspaceId={workspaceID} />)
                } else {
                  push(<DefaultOrgForm />);
                }
              } else {
                OpenInGitpod(branchURL, "Branch", repository, branch.branchName);
              }
            }}
            shortcut={{ modifiers: ["cmd"], key: "g" }}
          />
          <Action
            title="Open Branch in GitHub"
            onAction={() => {
              visitBranch?.(branch, repository);
              open(branchURL);
            }}
          />
          <Action
            title="Copy Branch URL"
            onAction={async () => {
              visitBranch?.(branch, repository);
              await showToast({
                title: `Copying "${branch.branchName}" url`,
                style: Toast.Style.Animated,
              });
              copyTextToClipboard(branchURL);
              await showToast({
                title: `Copied "${branch.branchName}" url`,
                style: Toast.Style.Success,
              });
            }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
          />
          {!fromCache && (
            <Action
              title="Add Branch to Recents"
              onAction={async () => {
                visitBranch?.(branch, repository);
                await showToast({
                  title: `Added "${branch.branchName}" to Recents`,
                  style: Toast.Style.Success,
                });
              }}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          )}

          {!fromCache && (
            <Action
              title="Show branch Preview"
              shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
              onAction={() => {
                if (changeBodyVisibility) {
                  changeBodyVisibility(true);
                }
              }}
            />
          )}
          {!fromCache && (
            <Action
              title="Hide branch Preview"
              shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
              onAction={() => {
                if (changeBodyVisibility) {
                  changeBodyVisibility(false);
                }
              }}
            />
          )}
          {fromCache && (
            <Action
              title="Remove from Recents"
              onAction={async () => {
                removeBranch?.(branch, repository);
                await showToast({
                  title: `Removed "${branch.compData}" from Recents`,
                  style: Toast.Style.Success,
                });
              }}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
            />
          )}
          {/* <Action
            title="Configure Workspace"
            onAction={() =>
              push(
                <ContextPreferences
                  revalidate={revalidate}
                  type="Branch"
                  repository={repository}
                  context={branch.branchName}
                />
              )
            }
            shortcut={{ modifiers: ["cmd"], key: "e" }}
          /> */}
          <Action.Push
            title="Switch Default Organization"
            shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
            target={<DefaultOrgForm />}
          />
        </ActionPanel>
      }
    />
  );
}
