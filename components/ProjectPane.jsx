import React from "react";

import hljs from "highlight.js";

import ProjectOutputPanel from "./ProjectOutputPanel";
import ProjectSourcesPanel from "./ProjectSourcesPanel";

const highlight = (str, lang) => {
  if (lang != null && hljs.getLanguage(lang)) {
    try {
      return hljs.highlight(lang, str).value;
    } catch (err) {
      console.error(err.stack);
    }
  }

  try {
    return hljs.highlightAuto(str).value;
  } catch (err) {
    console.error(err.stack);
  }

  return "";
};

export default class ProjectPane extends React.Component {
  static defaultProps = {
    refreshInterval: 15000
  }

  static propTypes() {
    return {
      endpoint: React.PropTypes.string.isRequired,
      name: React.PropTypes.string.isRequired,
      project: React.PropTypes.object.isRequired,
      refreshInterval: React.PropTypes.integer,
    };
  }

  constructor(props) {
    super(props);

    this.cancel = this.cancel.bind(this);
    this.process = this.process.bind(this);
    this.reprocess = this.reprocess.bind(this);
    this.makeMBTiles = this.makeMBTiles.bind(this);
  }

  state = {
    remote: this.props.project.status
  }

  componentDidMount() {
    // monitor status
    this.monitorStatus();
  }

  componentWillUnmount() {
    this.stopMonitoringStatus();
  }

  getButtons() {
    const { endpoint, name } = this.props;
    const { local, remote } = this.state;

    if (this.isRunning()) {
      if (local === "cancelling") {
        return (
          <button type="button" className="btn btn-warning btn-sm">Cancelling <i className="fa fa-circle-o-notch fa-spin" /></button>
        );
      }

      return (
        <button type="button" className="btn btn-warning btn-sm" onClick={this.cancel}>Cancel</button>
      );
    }

    switch (remote.state) {
    case "SUCCESS": {
      return (
        <span>
          <a href={`${endpoint}/projects/${name}/artifacts/odm_orthophoto.tif`} role="button" className="btn btn-success btn-sm">Download</a>
          {/* <button type="button" className="btn btn-success btn-sm" onClick={this.makeMBTiles}>Make MBTiles</button> */}
        </span>
      );
    }

    case "REVOKED": {
      if (local === "processing") {
        return (
          <button type="button" className="btn btn-primary btn-sm">Re-process <i className="fa fa-circle-o-notch fa-spin" /></button>
        );
      }

      return (
        <button type="button" className="btn btn-primary btn-sm" onClick={this.reprocess}>Re-process</button>
      );
    }

    default: {
      if (local === "processing") {
        return (
          <button type="button" className="btn btn-primary btn-sm">Process <i className="fa fa-circle-o-notch fa-spin" /></button>
        );
      }

      return (
        <button type="button" className="btn btn-primary btn-sm" onClick={this.process}>Process</button>
      );
    }
    }
  }

  getSpinner() {
    if (!this.isRunning()) {
      return null;
    }

    return (
      <a data-toggle="modal" data-target={`.${name}-status-modal`}> <i className="fa fa-circle-o-notch fa-spin" /></a>
    );
  }

  cancel() {
    console.log("Requesting cancellation...");

    this.setState({
      local: "cancelling"
    });

    const { endpoint, name } = this.props;

    fetch(`${endpoint}/projects/${name}/process`, {
      method: "DELETE",
    }).then(rsp => {
      console.log("rsp:", rsp);

      if (rsp.status >= 400) {
        // TODO display the underlying error message
        throw new Error("Failed.");
      }
    }).catch(err => {
      console.warn(err.stack);
    });
  }

  monitorStatus() {
    const { endpoint, name, refreshInterval } = this.props;

    this.statusChecker = setInterval(() => {
      fetch(`${endpoint}/projects/${name}/status`)
        .then(rsp => {
          if (!rsp.ok) {
            console.log("bad response");
          }

          return rsp.json();
        })
        .then(status => {
          if (this.state.local === "cancelling" &&
              status.state === "REVOKED") {
            this.setState({
              local: "cancelled"
            });
          }

          this.setState({
            remote: status
          });
        })
        .catch(err => {
          console.warn(err.stack);
        });
    }, refreshInterval);
  }

  stopMonitoringStatus() {
    clearInterval(this.statusChecker);
  }

  makeMBTiles() {
    console.log("Requesting MBTiles generation...");
  }

  process(force = false) {
    console.log("Requesting processing...");

    this.setState({
      local: "processing"
    });

    const { endpoint, name } = this.props;
    let qs = "";

    if (force) {
      qs += "force=true";
    }

    fetch(`${endpoint}/projects/${name}/process?${qs}`, {
      method: "POST",
    }).then(rsp => {
      console.log("rsp:", rsp);
      if (rsp.status >= 400) {
        // TODO display the underlying error message
        throw new Error("Failed.");
      }
    }).catch(err => {
      console.warn(err.stack);
    });
  }

  reprocess() {
    this.process(true);
  }

  isRunning() {
    const { remote } = this.state;

    return ["PENDING", "RUNNING"].indexOf(remote.state) >= 0;
  }

  render() {
    const { name } = this.props;
    const project = this.props.project;
    const { remote } = this.state;
    const { artifacts, images } = this.props.project;

    const buttons = this.getButtons();
    const spinner = this.getSpinner();

    return (
      <div className="row">
        <div className="x_panel">
          <div className="x_title">
            {/* TODO change to fa-chevron-down when opened; see http://stackoverflow.com/questions/13778703/adding-open-closed-icon-to-twitter-bootstrap-collapsibles-accordions */}
            <h2><a data-toggle="collapse" href={`#${name}-panel`}><i className="fa fa-chevron-right" /> {name}</a> {spinner}</h2>

            <div className="pull-right">
              {buttons}
            </div>
            <div className="clearfix" />
          </div>

          <div className={`modal fade ${name}-status-modal`} tabIndex="-1" role="dialog" aria-labelledby="mySmallModalLabel">
            <div className="modal-dialog modal-md" role="document">
              <div className="modal-content">
                <div className="modal-header">
                  <button type="button" className="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">×</span></button>
                  <h4 className="modal-title" id="mySmallModalLabel">Processing {name}...</h4>
                </div>
                <div className="modal-body">
                  <pre dangerouslySetInnerHTML={{ __html: highlight(JSON.stringify(project, null, 2), "json") }} />
                </div>
              </div>
            </div>
          </div>

          <div className="x_content panel-collapse collapse" id={`${name}-panel`}>
            <div role="tabpanel">
              <ul id="images" className="nav nav-tabs bar_tabs" role="tablist">
                <li role="presentation" className={remote.state == null ? "active" : null}>
                  <a href={`#${name}_images`} id={`${name}-images-tab`} role="tab" data-toggle="tab" aria-expanded="true">Sources</a>
                </li>
                <li role="presentation" className={remote.state ? "active" : null}>
                  <a href={`#${name}_artifacts`} id={`${name}-artifacts-tab`} role="tab" data-toggle="tab" aria-expanded="false">Output</a>
                </li>
              </ul>

              <div className="tab-content">
                <ProjectOutputPanel
                  active={remote.state != null}
                  artifacts={artifacts}
                  {...this.props}
                />

                <ProjectSourcesPanel
                  active={remote.state == null}
                  sources={images}
                  {...this.props}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
