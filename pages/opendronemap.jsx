import React from "react";
import Helmet from "react-helmet";

import { config } from "config";
import ProjectPane from "../components/ProjectPane";

export default class Index extends React.Component {
  state = {
    projects: {}
  }

  componentDidMount() {
    fetch(`${config.endpoint}/projects`)
      .then(rsp => rsp.json())
      .then(projects => {
        this.setState({
          projects
        });
      })
      .catch(err => console.warn(err.stack));
  }

  render() {
    const projects = Object.keys(this.state.projects).map((name, idx) => (
      <ProjectPane
        key={idx}
        name={name}
        project={this.state.projects[name]}
        endpoint={config.endpoint}
      />
    ));

    return (
      <div>
        <Helmet
          title={config.siteTitle}
        />
        <div className="page-title">
          <h3>OpenDroneMap <small>Projects</small> <button type="button" className="btn btn-primary btn-sm pull-right">New Project</button></h3>
        </div>
        <div className="clearfix" />

        { projects }
      </div>
    );
  }
}
