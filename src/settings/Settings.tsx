import * as React from "react";
import { Header, TitleSize } from "azure-devops-ui/Header";
import { Card } from "azure-devops-ui/Card";
import { Dropdown } from "azure-devops-ui/Dropdown";
import { DropdownMultiSelection, DropdownSelection } from "azure-devops-ui/Utilities/DropdownSelection";
import { TextField } from "azure-devops-ui/TextField";
import { Checkbox } from "azure-devops-ui/Checkbox";
import { Button } from "azure-devops-ui/Button";
import * as SDK from "azure-devops-extension-sdk";
import { getService } from "azure-devops-extension-sdk";
import { IExtensionDataManager, IExtensionDataService } from "azure-devops-extension-api";
import { showRootComponent } from "../Common";
import { Observer } from "azure-devops-ui/Observer";
import "azure-devops-ui/Core/override.css";

interface ISettingsState {
    projects: { id: string, text: string }[];
    engine: string;
    apiKey: string;
    useAzure: boolean;
    selectedProjects: { id: string, text: string }[];
}

export class SettingsPage extends React.Component<{}, ISettingsState> {
    private projectSelection = new DropdownMultiSelection();
    private engineSelection = new DropdownSelection();
    private dataManager: IExtensionDataManager | undefined;

    constructor(props: {}) {
        super(props);
        this.state = {
            projects: [],
            engine: 'davinci-codex',
            apiKey: '',
            useAzure: false,
            selectedProjects: [],
        };

        this.saveSettings = this.saveSettings.bind(this);
        this.loadSettings = this.loadSettings.bind(this);
    }

    public async componentDidMount() {
        SDK.init();
        await this.loadDataManager();
        await this.loadProjects();
        await this.loadSettings();
    }

    private async loadDataManager() {
        const accessToken = await SDK.getAccessToken();
        const dataService = await getService<IExtensionDataService>("ms.vss-features.extension-data-service");
        this.dataManager = await dataService.getExtensionDataManager(SDK.getExtensionContext().id, accessToken);
    }

    public async loadProjects() {
        if (process.env.NODE_ENV === 'development2') {
            this.loadProjectsStub();
        } else {
            try {
                const accessToken = await SDK.getAccessToken();
                const organization = await SDK.getHost().name;
                const response = await fetch(`https://dev.azure.com/${organization}/_apis/projects?api-version=6.0`, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    const projects = data.value.map((project: any) => ({
                        id: project.id,
                        text: project.name
                    }));
                    this.setState({ projects });
                } else {
                    console.error('Error fetching projects:', response.statusText);
                }
            } catch (error) {
                console.error('Error fetching projects:', error);
            }
        }
    }

    public loadProjectsStub() {
        const stubProjects = [
            { id: "project1", text: "Stub Project 1" },
            { id: "project2", text: "Stub Project 2" },
            { id: "project3", text: "Stub Project 3" }
        ];
        this.setState({ projects: stubProjects });
    }

    public async saveSettings() {
        const selectedIds = this.projectSelection.value
            .map((selectionRange) => {
                return this.state.projects
                    .slice(selectionRange.beginIndex, selectionRange.endIndex + 1)
                    .map((item) => item.id);
            }).flat();

        const settings = {
            projects: selectedIds,
            engine: this.state.engine,
            apiKey: this.state.apiKey,
            useAzure: this.state.useAzure
        };

        if (this.dataManager) {
            await this.dataManager.setValue("chatgpt-settings", settings);
            alert('Settings saved successfully!');
        }
    }

    public async loadSettings() {
        if (this.dataManager) {
            const settings = await this.dataManager.getValue<any>("chatgpt-settings", { defaultValue: {} });
            this.setState({
                engine: settings.engine || 'davinci-codex',
                apiKey: settings.apiKey || '',
                useAzure: settings.useAzure || false,
                selectedProjects: settings.projects || [],
            });

            // Update projectSelection based on loaded settings
            if (settings.projects && settings.projects.length > 0) {
                const selectedIndices = this.state.projects.map((project, index) => settings.projects.includes(project.id) ? index : -1).filter(index => index >= 0);
                selectedIndices.forEach(index => this.projectSelection.select(index));
            }
        }
    }

    public render(): JSX.Element {
        return (
            <div style={{ width: "100%" }}>
                <Header title="ChatGPT Code Review Settings" titleSize={TitleSize.Large} />
                <div className="page-content flex-grow" style={{ marginTop: "20px", marginLeft: "20px", marginRight: "20px" }}>
                    <Card>
                        <form id="settings-form">
                            <div className="form-item">
                                <label htmlFor="projects">Select Projects</label>
                                <Observer selection={this.projectSelection}>
                                    {() => (
                                        <Dropdown
                                            placeholder="Select projects"
                                            items={this.state.projects}
                                            selection={this.projectSelection}
                                        />
                                    )}
                                </Observer>
                            </div>
                            <div className="form-item">
                                <label htmlFor="engine">Select GPT Engine</label>
                                <Observer selection={this.engineSelection}>
                                    {() => (
                                        <Dropdown
                                            placeholder="Select GPT Engine"
                                            items={[
                                                { id: "davinci-codex", text: "Davinci Codex" },
                                                { id: "curie-codex", text: "Curie Codex" }
                                            ]}
                                            selection={this.engineSelection}
                                            onSelect={(event, item) => this.setState({ engine: item.id })}
                                        />
                                    )}
                                </Observer>
                            </div>
                            <div className="form-item">
                                <label htmlFor="apiKey">API Key</label>
                                <TextField
                                    value={this.state.apiKey}
                                    onChange={(e, newValue) => this.setState({ apiKey: newValue })}
                                    ariaLabel="API Key"
                                />
                            </div>
                            <div className="form-item">
                                <Checkbox
                                    label="Use Azure OpenAI Endpoint"
                                    checked={this.state.useAzure}
                                    onChange={(e, checked) => this.setState({ useAzure: checked })}
                                    ariaLabel="Use Azure OpenAI Endpoint"
                                />
                            </div>
                            <Button text="Save" onClick={this.saveSettings} />
                        </form>
                    </Card>
                </div>
            </div>
        );
    }
}

export default SettingsPage;
showRootComponent(<SettingsPage />);
