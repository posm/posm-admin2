import React from "react";
import Button from "react-bootstrap/lib/Button";
import Form from "react-bootstrap/lib/Form";
import FormControl from "react-bootstrap/lib/FormControl";
import FormGroup from "react-bootstrap/lib/FormGroup";
import Helmet from "react-helmet";
import Modal from "react-bootstrap/lib/Modal";

import { config } from "config";
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

    this.close = this.close.bind(this);
    this.getProjects = this.getProjects.bind(this);
    this.open = this.open.bind(this);
    this.saveProject = this.saveProject.bind(this);
    this.updateProjectName = this.updateProjectName.bind(this);
  }

  state = {
    projectName: "",
    projects: {},
    showModal: false,
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

  close() {
    this.setState({
      showModal: false,
    });
  }

  open() {
    this.setState({
      showModal: true,
    });
  }

  saveProject(evt) {
    evt.preventDefault();

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

    this.close();
  }

  updateProjectName(evt) {
    this.setState({
      projectName: evt.target.value,
    });
  }

  render() {
    const { endpoint, imageryEndpoint } = this.props;

    // TODO sort alphabetically (not by UUID)
    const projects = Object.keys(this.state.projects).map(name => (
      <ProjectPane
        key={name}
        name={name}
        project={this.state.projects[name]}
        endpoint={`${endpoint}/projects/${name}`}
        imageryEndpoint={imageryEndpoint}
      />
    ));

    const { projectName } = this.state;

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
            <Button className="pull-right" bsSize="small" bsStyle="primary" onClick={this.open}>New Project</Button>
          </div>
        </div>
        <div className="clearfix" />

        <Modal
          show={this.state.showModal}
          onHide={this.close}
          onExit={this.getProjects}
        >
          <Modal.Header closeButton>
            <Modal.Title>New Project</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form horizontal onSubmit={this.saveProject}>
              <FormGroup>
                <FormControl type="text" placeholder="Project Name" value={projectName} onChange={this.updateProjectName} autoFocus="true" />
              </FormGroup>
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button onClick={this.close}>Close</Button>
            <Button
              bsStyle="primary"
              onClick={this.saveProject}
            >Create</Button>
          </Modal.Footer>
        </Modal>

        { projects }
      </div>
    );
  }
}
