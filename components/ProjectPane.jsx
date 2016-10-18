import React from "react";

import highlight from "../utils/highlight";
import ProjectOutputPanel from "./ProjectOutputPanel";
import ProjectSourcesPanel from "./ProjectSourcesPanel";

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
    this.delete = this.delete.bind(this);
    this.ingestSource = this.ingestSource.bind(this);
    this.makeMBTiles = this.makeMBTiles.bind(this);
    this.process = this.process.bind(this);
    this.reprocess = this.reprocess.bind(this);
  }

  state = {
    pending: [],
    project: this.props.project,
    showSpinner: false,
  }

  componentDidMount() {
    this.monitor();
  }

  componentWillUpdate(nextProps, nextState) {
    const nextStatus = nextState.project.status;
    const { status } = this.state.project;

    if (["SUCCESS", "FAILURE"].indexOf(nextStatus.state) >= 0 &&
        nextStatus.state !== status.state) {
      this.setState({
        showSpinner: false,
      });
    }
  }

  componentWillUnmount() {
    this.stopMonitoring();
  }

  getDeleteButton() {
    const { pending } = this.state;

    if (pending.indexOf("deleting") >= 0) {
      return (
        <button type="button" className="btn btn-danger btn-sm">Deleting <i className="fa fa-circle-o-notch fa-spin" /></button>
      );
    }

    return (
      <button type="button" className="btn btn-danger btn-sm" onClick={this.delete}>Delete</button>
    );
  }

  getIngestButton() {
    const { pending, project } = this.state;
    const { user } = project;

    if (user.imagery == null && pending.indexOf("mbtiles") < 0) {
      if (pending.indexOf("ingesting") >= 0) {
        return (
          <button type="button" className="btn btn-warning btn-sm">Ingesting <i className="fa fa-circle-o-notch fa-spin" /></button>
        );
      }

      return (
        <button type="button" className="btn btn-dark btn-sm" onClick={this.ingestSource}>Ingest</button>
      );
    }

    return null;
  }

  getMBTilesButton() {
    const { user } = this.state.project;
    const { pending } = this.state;

    if (user.mbtiles == null) {
      if (pending.indexOf("mbtiles") >= 0) {
        return (
          <button type="button" className="btn btn-warning btn-sm">Making MBTiles <i className="fa fa-circle-o-notch fa-spin" /></button>
        );
      }

      if (pending.indexOf("ingesting") >= 0) {
        return (
          <button type="button" className="btn btn-dark btn-sm">Make MBTiles</button>
        );
      }

      return (
        <button type="button" className="btn btn-dark btn-sm" onClick={this.makeMBTiles}>Make MBTiles</button>
      );
    }

    return (
      <a href={user.mbtiles} role="button" className="btn btn-success btn-sm">Download MBTiles</a>
    );
  }

  getButtons() {
    const { endpoint } = this.props;
    const { pending, project } = this.state;
    const { status } = project;

    if (this.isRunning()) {
      if (pending.indexOf("cancelling") >= 0) {
        return (
          <button type="button" className="btn btn-warning btn-sm">Cancelling <i className="fa fa-circle-o-notch fa-spin" /></button>
        );
      }

      return (
        <button type="button" className="btn btn-warning btn-sm" onClick={this.cancel}>Cancel</button>
      );
    }

    switch (status.state) {
    case "SUCCESS": {
      return (
        <span>
          <a href={`${endpoint}/artifacts/odm_orthophoto.tif`} role="button" className="btn btn-success btn-sm">Download GeoTIFF</a>
          { this.getIngestButton() }
          { this.getMBTilesButton() }
        </span>
      );
    }

    case "FAILURE":
    case "REVOKED": {
      if (pending.indexOf("processing") >= 0 && !this.isRunning()) {
        return (
          <button type="button" className="btn btn-dark btn-sm">Re-processing <i className="fa fa-circle-o-notch fa-spin" /></button>
        );
      }

      return (
        <button type="button" className="btn btn-dark btn-sm" onClick={this.reprocess}>Re-process</button>
      );
    }

    default: {
      if (pending.indexOf("processing") >= 0 && !this.isRunning()) {
        return (
          <button type="button" className="btn btn-dark btn-sm">Processing <i className="fa fa-circle-o-notch fa-spin" /></button>
        );
      }

      return (
        <button type="button" className="btn btn-dark btn-sm" onClick={this.process}>Process</button>
      );
    }
    }
  }

  getFailure() {
    const { name } = this.props;
    const { status } = this.state.project;

    if (status.state !== "FAILURE") {
      return null;
    }

    return (
      <a data-toggle="modal" data-target={`.${name}-status-modal`}> <i className="fa fa-exclamation-triangle red" /></a>
    );
  }

  getSpinner() {
    if (this.shouldShowSpinner()) {
      const { name } = this.props;

      return (
        <a data-toggle="modal" data-target={`.${name}-status-modal`}> <i className="fa fa-circle-o-notch fa-spin blue" /></a>
      );
    }

    return null;
  }

  shouldShowSpinner() {
    return this.state.showSpinner;
  }

  cancel() {
    const { endpoint } = this.props;
    let { pending } = this.state;

    if (pending.indexOf("cancelling") >= 0) {
      throw new Error("Already cancelling.");
    }

    pending.push("cancelling");

    this.setState({
      pending,
      showSpinner: true,
    });

    fetch(`${endpoint}/process`, {
      method: "DELETE",
    }).then(rsp => {
      console.log("rsp:", rsp);

      if (rsp.status >= 400) {
        // TODO display the underlying error message
        throw new Error("Failed.");
      }

      pending = this.state.pending;
      pending.splice(pending.indexOf("cancelling"), 1);

      this.setState({
        pending,
        showSpinner: false,
      });
    }).catch(err => {
      console.warn(err.stack);
    });
  }

  delete() {
    const { endpoint } = this.props;
    let { pending } = this.state;

    if (pending.indexOf("deleting") >= 0) {
      throw new Error("Already deleting.");
    }

    pending.push("deleting");
    this.setState({
      pending,
      showSpinner: true,
    });

    fetch(`${endpoint}`, {
      method: "DELETE",
    }).then(rsp => {
      console.log("rsp:", rsp);

      if (rsp.status >= 400) {
        // TODO display the underlying error message
        throw new Error("Failed.");
      }

      pending = this.state.pending;
      pending.splice(pending.indexOf("deleting"), 1);

      this.setState({
        pending,
        showSpinner: false,
      });
    }).catch(err => {
      console.warn(err.stack);
    });
  }

  checkIngestionStatus(source, failureCallback, successCallback) {
    const { imageryEndpoint } = this.props;

    fetch(`${imageryEndpoint}/imagery/${source.name}/ingest/status`)
      .then(rsp => rsp.json())
      .then(status => {
        switch (status.state) {
        case "FAILURE":
        case "REVOKED": {
          failureCallback(status);

          break;
        }

        case "SUCCESS": {
          successCallback(status);

          break;
        }

        default:
        }
      })
      .catch(err => console.warn(err.stack));
  }

  updateMetadata(body, successCallback) {
    const { endpoint } = this.props;

    // update metadata
    fetch(endpoint, {
      body: JSON.stringify(body),
      method: "PATCH"
    })
      .then(rsp => rsp.json())
      .then(rsp => successCallback)
      .catch(err => console.warn(err.stack));
  }

  ingestSource() {
    console.log("Ingesting source...");

    const { imageryEndpoint, refreshInterval } = this.props;
    let { pending } = this.state;

    if (pending.indexOf("ingesting") >= 0) {
      throw new Error("Ingestion already in process.");
    }

    pending.push("ingesting");

    // start spinner
    this.setState({
      pending,
    });

    // trigger ingestion
    this.ingest(source => {
      // TODO move interval into ingest()
      const imageryChecker = setInterval(() => {
        this.checkIngestionStatus(source, status => {
          console.warn("Ingestion failed:", status);
          clearInterval(imageryChecker);

          pending = this.state.pending;
          pending.splice(pending.indexOf("ingesting"), 1);

          this.setState({
            pending,
          });
        }, status => {
          clearInterval(imageryChecker);

          // update metadata
          this.updateMetadata({
            imagery: `${imageryEndpoint}/imagery/${source.name}`
          }, rsp => {
            pending = this.state.pending;
            pending.splice(pending.indexOf("ingesting"), 1);

            this.setState({
              pending,
            });
          });
        });
      }, refreshInterval);
    });
  }

  monitor() {
    const { endpoint, refreshInterval } = this.props;

    this.checker = setInterval(() => {
      fetch(`${endpoint}`)
        .then(rsp => {
          if (!rsp.ok) {
            console.log("bad response");
          }

          return rsp.json();
        })
        .then(project => {
          const { pending } = this.state;

          if (pending.indexOf("cancelling") >= 0 &&
              project.status.state === "REVOKED") {
            pending.splice(pending.indexOf("cancelling"), 1);

            this.setState({
              pending,
            });
          }

          this.setState({
            project,
          });
        })
        .catch(err => {
          console.warn(err.stack);
        });
    }, refreshInterval);
  }

  stopMonitoring() {
    clearInterval(this.checker);
  }

  ingest(callback) {
    const { endpoint, imageryEndpoint } = this.props;

    fetch(`${imageryEndpoint}/imagery/ingest?url=${encodeURIComponent(`${endpoint}/artifacts/odm_orthophoto.tif`)}`, {
      method: "POST"
    }).then(rsp => rsp.json())
      .then(callback)
      .catch(err => console.warn(err.stack));
  }

  requestMBTiles(endpoint, failureCallback, successCallback) {
    const { refreshInterval } = this.props;

    fetch(`${endpoint}/mbtiles`, {
      method: "POST"
    })
      .then(rsp => {
        const mbtilesChecker = setInterval(() => {
          fetch(`${endpoint}/mbtiles/status`)
            .then(rsp => rsp.json())
            .then(status => {
              switch (status.state) {
              case "FAILURE":
              case "REVOKED": {
                clearInterval(mbtilesChecker);

                failureCallback(status);

                break;
              }

              case "SUCCESS": {
                clearInterval(mbtilesChecker);

                successCallback(status);

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

  makeMBTiles() {
    console.log("Requesting MBTiles generation...");

    const { imageryEndpoint, refreshInterval } = this.props;
    let { pending } = this.state;
    const { user } = this.state.project;

    if (pending.indexOf("mbtiles") >= 0) {
      throw new Error("MBTiles generation already in process.");
    }

    pending.push("mbtiles");

    // start spinner
    this.setState({
      pending,
    });

    if (user.imagery) {
      // imagery already ingested
      return this.requestMBTiles(user.imagery, status => {
        console.warn("MBTiles generation failed:", status);

        pending = this.state.pending;
        pending.splice(pending.indexOf("mbtiles"), 1);

        this.setState({
          pending,
        });
      }, status => {
        console.log("Marking presence of MBTiles");

        this.updateMetadata({
          mbtiles: `${user.imagery}/mbtiles`
        }, rsp => {
          pending = this.state.pending;
          pending.splice(pending.indexOf("mbtiles"), 1);

          this.setState({
            pending,
          });
        });
      });
    }

    // trigger ingestion
    return this.ingest(source => {
      const imageryChecker = setInterval(() => {
        this.checkIngestionStatus(source, status => {
          console.warn("Ingestion failed:", status);
          clearInterval(imageryChecker);

          pending = this.state.pending;
          pending.splice(pending.indexOf("ingesting"), 1);

          this.setState({
            pending,
          });
        }, status => {
          clearInterval(imageryChecker);

          this.requestMBTiles(`${imageryEndpoint}/imagery/${source.name}`, status => {
            console.warn("MBTiles generation failed:", status);

            pending = this.state.pending;
            pending.splice(pending.indexOf("mbtiles"), 1);

            this.setState({
              pending,
            });
          }, status => {
            console.log("Marking presence of MBTiles");

            this.updateMetadata({
              mbtiles: `${imageryEndpoint}/imagery/${source.name}/mbtiles`
            }, rsp => {
              pending = this.state.pending;
              pending.splice(pending.indexOf("mbtiles"), 1);

              this.setState({
                pending,
              });
            });
          });

          // update metadata
          this.updateMetadata({
            imagery: `${imageryEndpoint}/imagery/${source.name}`
          }, rsp => {
            pending = this.state.pending;
            pending.splice(pending.indexOf("ingesting"), 1);

            this.setState({
              pending,
            });
          });
        });
      }, refreshInterval);
    });
  }

  process(force = false) {
    let { pending } = this.state;

    if (pending.indexOf("processing") >= 0) {
      throw new Error("Already processing.");
    }

    pending.push("processing");

    this.setState({
      pending,
      showSpinner: true,
    });

    const { endpoint } = this.props;
    let qs = "";

    if (force) {
      qs += "force=true";
    }

    fetch(`${endpoint}/process?${qs}`, {
      method: "POST",
    }).then(rsp => {
      console.log("rsp:", rsp);
      if (rsp.status >= 400) {
        // TODO display the underlying error message
        throw new Error("Failed.");
      }

      pending = this.state.pending;
      pending.splice(pending.indexOf("processing"), 1);

      this.setState({
        pending,
      });
    }).catch(err => {
      console.warn(err.stack);
    });
  }

  reprocess() {
    this.process(true);
  }

  isRunning() {
    const { status } = this.state.project;

    return ["PENDING", "RUNNING"].indexOf(status.state) >= 0;
  }

  render() {
    const { name } = this.props;
    const { project } = this.state;
    const { artifacts, images, status, user } = project;

    const projectName = user.name || name;

    const buttons = this.getButtons();
    const deleteButton = this.getDeleteButton();
    const failure = this.getFailure();
    const spinner = this.getSpinner();

    return (
      <div className="row">
        <div className="x_panel">
          <div className="x_title">
            {/* TODO change to fa-chevron-down when opened; see http://stackoverflow.com/questions/13778703/adding-open-closed-icon-to-twitter-bootstrap-collapsibles-accordions */}
            <h2><a data-toggle="collapse" href={`#${name}-panel`}><i className="fa fa-chevron-right" /> {projectName}</a> {failure} {spinner}</h2>

            <div className="pull-right">
              {buttons}
              {/* TODO wire this up (needs API implementation) deleteButton */}
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
                    }, null, 2), "json") }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="x_content panel-collapse collapse" id={`${name}-panel`}>
            <div role="tabpanel">
              <ul id="images" className="nav nav-tabs bar_tabs" role="tablist">
                <li role="presentation" className={status.state == null ? "active" : null}>
                  <a href={`#${name}_images`} id={`${name}-images-tab`} role="tab" data-toggle="tab" aria-expanded="true">Sources</a>
                </li>
                <li role="presentation" className={status.state ? "active" : null}>
                  <a href={`#${name}_artifacts`} id={`${name}-artifacts-tab`} role="tab" data-toggle="tab" aria-expanded="false">Output</a>
                </li>
              </ul>

              <div className="tab-content">
                <ProjectOutputPanel
                  {...this.props}
                  active={status.state != null}
                  artifacts={artifacts}
                  project={project}
                />

                <ProjectSourcesPanel
                  {...this.props}
                  active={status.state == null}
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
