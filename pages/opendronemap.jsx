import React from "react";
import Helmet from "react-helmet";

import { config } from "config";
import Modal from "../components/Modal";
import ModalBody from "../components/ModalBody";
import ModalFooter from "../components/ModalFooter";
import ModalHeader from "../components/ModalHeader";
import ProjectPane from "../components/ProjectPane";

export default class Index extends React.Component {
  static defaultProps = {
    endpoint: config.odmEndpoint,
    imageryEndpoint: config.imageryEndpoint,
  }

  static propTypes() {
    return {
      endpoint: React.PropTypes.string.isRequired,
      imageryEndpoint: React.PropTypes.string.isRequired,
    };
  }

  constructor(props) {
    super(props);

    this.getProjects = this.getProjects.bind(this);
    this.saveProject = this.saveProject.bind(this);
    this.updateProjectName = this.updateProjectName.bind(this);
  }

  state = {
    projectName: "",
    projects: {},
  }

  componentDidMount() {
    this.getProjects();
  }

  getProjects() {
    const { endpoint } = this.props;

    this.setState({
      loading: true,
    });

    fetch(`${endpoint}/projects`)
      .then(rsp => rsp.json())
      .then(projects => this.setState({
        loading: false,
        projects,
      }))
      .catch(err => console.warn(err.stack));
  }

  getRefreshSpinner() {
    const { loading } = this.state;

    if (loading) {
      return (
        <i className="fa fa-refresh fa-spin" />
      );
    }

    return (
      <a onClick={this.getProjects}><i className="fa fa-refresh" /></a>
    );
  }

  saveProject() {
    const { endpoint } = this.props;
    const { projectName } = this.state;

    if (projectName !== "") {
      // update metadata
      fetch(`${endpoint}/projects`, {
        body: JSON.stringify({
          name: projectName,
        }),
        method: "PUT"
      }).then(rsp => this.getProjects())
        .catch(err => console.warn(err.stack));
    }

    // reset the new project name for the next upload
    this.setState({
      projectName: "",
    });
  }

  updateProjectName(event) {
    this.setState({
      projectName: event.target.value,
    });
  }

  render() {
    const { endpoint, imageryEndpoint } = this.props;

    const projects = Object.keys(this.state.projects).map(name => (
      <ProjectPane
        key={name}
        name={name}
        project={this.state.projects[name]}
        endpoint={`${endpoint}/projects/${name}`}
        imageryEndpoint={imageryEndpoint}
      />
    ));

    const { newProjectName } = this.state;

    return (
      <div>
        <Helmet
          title={config.siteTitle}
        />
        <div className="page-title">
          <div className="title_left">
            <h3>OpenDroneMap <small>Projects {this.getRefreshSpinner()}</small></h3>
          </div>
          <div className="title_right">
            <button type="button" className="btn btn-primary btn-sm pull-right" data-toggle="modal" data-target="#newProject">New Project</button>
          </div>
        </div>
        <div className="clearfix" />

        <Modal
          id="newProject"
          onHidden={this.getProjects}
        >
          <ModalHeader
            title="New Project"
          />
          <ModalBody>
            <form className="form-horizontal form-label-left">
              <div className="form-group">
                <input type="text" className="form-control" placeholder="Project Name" value={newProjectName} onChange={this.updateProjectName} />
              </div>
            </form>
          </ModalBody>
          <ModalFooter>
            <button type="button" className="btn btn-default" data-dismiss="modal">Close</button>
            <button type="button" className="btn btn-primary" data-dismiss="modal" onClick={this.saveProject}>Create</button>
          </ModalFooter>
        </Modal>

        { projects }
      </div>
    );
  }
}
