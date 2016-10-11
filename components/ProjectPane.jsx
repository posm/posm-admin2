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
    refreshInterval: 10000
  }

  static propTypes() {
    return {
      endpoint: React.PropTypes.string.isRequired,
      imageryEndpoint: React.PropTypes.string.isRequired,
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
    project: this.props.project,
    remote: this.props.project.status,
  }

  componentDidMount() {
    // monitor status
    this.monitorStatus();
  }

  componentWillUpdate(nextProps, nextState) {
    if (nextState.remote.state === "SUCCESS" &&
        nextState.remote.state !== this.state.remote.state) {
      const { endpoint, name } = this.props;

      // refresh project metadata
      fetch(`${endpoint}/projects/${name}`)
        .then(rsp => rsp.json())
        .then(project => this.setState({
          project
        }))
        .catch(err => console.warn(err.stack));
    }
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
      // TODO check state for an existing MBTiles link
      return (
        <span>
          <a href={`${endpoint}/projects/${name}/artifacts/odm_orthophoto.tif`} role="button" className="btn btn-success btn-sm">Download GeoTIFF</a>
          {/* wire up ingest button */}
          <button type="button" className="btn btn-success btn-sm" onClick={this.ingestSource}>Ingest</button>
          <button type="button" className="btn btn-success btn-sm" onClick={this.makeMBTiles}>Make MBTiles</button>
        </span>
      );
    }

    case "FAILURE":
    case "REVOKED": {
      if (local === "processing" && !this.isRunning()) {
        return (
          <button type="button" className="btn btn-primary btn-sm">Re-processing <i className="fa fa-circle-o-notch fa-spin" /></button>
        );
      }

      return (
        <button type="button" className="btn btn-primary btn-sm" onClick={this.reprocess}>Re-process</button>
      );
    }

    default: {
      if (local === "processing" && !this.isRunning()) {
        return (
          <button type="button" className="btn btn-primary btn-sm">Processing <i className="fa fa-circle-o-notch fa-spin" /></button>
        );
      }

      return (
        <button type="button" className="btn btn-primary btn-sm" onClick={this.process}>Process</button>
      );
    }
    }
  }

  getFailure() {
    const { name } = this.props;
    const { remote } = this.state;

    if (remote.state !== "FAILURE") {
      return null;
    }

    return (
      <a data-toggle="modal" data-target={`.${name}-status-modal`}> <i className="fa fa-exclamation-triangle red" /></a>
    );
  }

  getSpinner() {
    if (!this.isRunning()) {
      return null;
    }

    const { name } = this.props;

    return (
      <a data-toggle="modal" data-target={`.${name}-status-modal`}> <i className="fa fa-circle-o-notch fa-spin blue" /></a>
    );
  }

  cancel() {
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
              local: null
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

    const { endpoint, imageryEndpoint, name, refreshInterval } = this.props;

    // TODO start spinner
    // TODO clean up this mess

    // trigger ingestion
    fetch(`${imageryEndpoint}/imagery/ingest?url=${encodeURIComponent(`${endpoint}/projects/${name}/artifacts/odm_orthophoto.tif`)}`, {
      method: "POST"
    })
      .then(rsp => rsp.json())
      .then(source => {
        const imageryChecker = setInterval(() => {
          fetch(`${imageryEndpoint}/imagery/${source.name}/ingest/status`)
            .then(rsp => rsp.json())
            .then(status => {
              switch (status.state) {
              case "FAILURE":
              case "REVOKED": {
                console.warn("Ingestion failed:", status);
                clearInterval(imageryChecker);
                break;
              }

              case "SUCCESS": {
                clearInterval(imageryChecker);

                // update metdata
                fetch(`${endpoint}/projects/${name}`, {
                  body: JSON.stringify({
                    imagery: `${imageryEndpoint}/imagery/${source.name}`
                  }),
                  method: "PATCH"
                })
                  .then(rsp => rsp.json())
                  .then(rsp => console.log)
                  .catch(err => console.warn(err.stack));

                fetch(`${imageryEndpoint}/imagery/${source.name}/mbtiles`, {
                  method: "POST"
                })
                  .then(rsp => rsp.json())
                  .then(status => {
                    const mbtilesChecker = setInterval(() => {
                      fetch(`${imageryEndpoint}/imagery/${source.name}/mbtiles/status`)
                        .then(rsp => rsp.json())
                        .then(status => {
                          switch (status.state) {
                          case "FAILURE":
                          case "REVOKED": {
                            console.warn("MBTiles generation failed:", status);
                            clearInterval(mbtilesChecker);
                            break;
                          }

                          case "SUCCESS": {
                            clearInterval(mbtilesChecker);

                            // update metdata
                            fetch(`${endpoint}/projects/${name}`, {
                              body: JSON.stringify({
                                mbtiles: `${imageryEndpoint}/imagery/${source.name}/mbtiles`
                              }),
                              method: "PATCH"
                            })
                              .then(rsp => rsp.json())
                              // TODO stop spinner, display MBTiles download link
                              .then(rsp => console.log)
                              .catch(err => console.warn(err.stack));

                            break;
                          }

                          default:
                          }
                        })
                        .catch(err => console.warn(err.stack));
                    }, refreshInterval);
                  })
                  .catch(err => console.warn(err.stack));

                break;
              }

              default:
              }
            })
            .catch(err => console.warn(err.stack));
        }, refreshInterval);
      })
      .catch(err => console.warn(err.stack));
  }

  process(force = false) {
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
    const { project, remote } = this.state;
    const { artifacts, images } = project;

    const buttons = this.getButtons();
    const failure = this.getFailure();
    const spinner = this.getSpinner();

    return (
      <div className="row">
        <div className="x_panel">
          <div className="x_title">
            {/* TODO change to fa-chevron-down when opened; see http://stackoverflow.com/questions/13778703/adding-open-closed-icon-to-twitter-bootstrap-collapsibles-accordions */}
            <h2><a data-toggle="collapse" href={`#${name}-panel`}><i className="fa fa-chevron-right" /> {name}</a> {failure} {spinner}</h2>

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
                  <h4 className="modal-title" id="mySmallModalLabel">{name} Status</h4>
                </div>
                <div className="modal-body">
                  <pre
                    dangerouslySetInnerHTML={{ __html: highlight(JSON.stringify({
                      project,
                      remote
                    }, null, 2), "json") }}
                  />
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
                  {...this.props}
                  active={remote.state != null}
                  artifacts={artifacts}
                  project={project}
                />

                <ProjectSourcesPanel
                  {...this.props}
                  active={remote.state == null}
                  sources={images}
                  project={project}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
