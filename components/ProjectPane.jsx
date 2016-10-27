import React from "react";
import Button from "react-bootstrap/lib/Button";
import Form from "react-bootstrap/lib/Form";

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
    this.toggle = this.toggle.bind(this);
    this.editName = this.editName.bind(this);
    this.updateProjectName = this.updateProjectName.bind(this);
    this.saveProject = this.saveProject.bind(this);
  }

  state = {
    editing: false,
    ingesting: false,
    pending: [],
    project: this.props.project,
    projectName: this.props.project.user.name || this.props.name,
    shown: false,
    showSpinner: false,
    tiling: false,
  }

  componentDidMount() {
    this.monitor();
  }

  componentWillUpdate(nextProps, nextState) {
    const nextStatus = nextState.project.status;
    const { status } = this.state.project;

    if (["SUCCESS", "FAILURE", "REVOKED"].indexOf(nextStatus.state) >= 0 &&
        nextStatus.state !== status.state) {
      this.setState({
        showSpinner: false,
      });
    }

    // clear pending states; we're all caught up
    if (nextState.project !== this.state.project) {
      this.setState({
        pending: [],
        projectName: nextState.project.user.name || this.props.name,
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
    const { ingesting, pending, project } = this.state;
    const { user } = project;

    if (ingesting || pending.indexOf("ingesting") >= 0) {
      return (
        <button type="button" className="btn btn-warning btn-sm">Ingesting <i className="fa fa-circle-o-notch fa-spin" /></button>
      );
    }

    if (user.imagery == null && pending.indexOf("mbtiles") < 0) {
      return (
        <button type="button" className="btn btn-dark btn-sm" onClick={this.ingestSource}>Ingest</button>
      );
    }

    return null;
  }

  getMBTilesButton() {
    const { user } = this.state.project;
    const { pending, tiling } = this.state;

    if (tiling || pending.indexOf("mbtiles") >= 0) {
      return (
        <button type="button" className="btn btn-warning btn-sm">Making MBTiles <i className="fa fa-circle-o-notch fa-spin" /></button>
      );
    }

    if (user.mbtiles == null) {
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

  getProject(callback = () => {}) {
    const { endpoint } = this.props;

    fetch(endpoint)
      .then(rsp => {
        if (!rsp.ok) {
          console.log("bad response");
        }

        return rsp.json();
      })
      .then(project => {
        this.setState({
          project,
        });

        callback(project);
      })
      .catch(err => {
        console.warn(err.stack);
      });
  }

  shouldShowSpinner() {
    return this.state.showSpinner;
  }

  cancel() {
    const { endpoint } = this.props;
    const { pending } = this.state;

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
      if (rsp.status >= 400) {
        // TODO display the underlying error message
        throw new Error("Failed.");
      }
    }).catch(err => {
      console.warn(err.stack);
    });
  }

  toggle() {
    this.setState({
      shown: !this.state.shown,
    });
  }

  editName() {
    this.setState({
      editing: true,
    });
  }

  updateProjectName(evt) {
    this.setState({
      projectName: evt.target.value,
    });
  }

  saveProject(evt) {
    evt.preventDefault();

    this.updateMetadata({
      name: this.state.projectName,
    });

    this.setState({
      editing: false,
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

  checkIngestionStatus(sourceUrl, failureCallback, successCallback) {
    fetch(`${sourceUrl}/ingest/status`)
      .then(rsp => rsp.json())
      .then(status => {
        console.log("Ingestion status:", status);
        switch (status.state) {
        case "FAILURE":
        case "REVOKED": {
          this.setState({
            ingesting: false,
          });

          failureCallback(status);

          break;
        }

        case "SUCCESS": {
          this.setState({
            ingesting: false,
          });

          successCallback(status);

          break;
        }

        default:
        }
      })
      .catch(err => console.warn(err.stack));
  }

  updateMetadata(body) {
    const { endpoint } = this.props;

    console.log("Updating metadata with", body);

    // update metadata
    fetch(endpoint, {
      body: JSON.stringify(body),
      method: "PATCH"
    }).then(rsp => this.getProject())
      .catch(err => console.warn(err.stack));
  }

  ingestSource() {
    console.log("Ingesting source...");

    const { refreshInterval } = this.props;
    const { pending } = this.state;

    if (pending.indexOf("ingesting") >= 0) {
      throw new Error("Ingestion already in process.");
    }

    pending.push("ingesting");

    // start spinner
    this.setState({
      pending,
    });

    // trigger ingestion
    this.ingest(sourceUrl => {
      this.setState({
        ingesting: true,
      });

      // update metadata
      this.updateMetadata({
        imagery: sourceUrl,
      });

      // TODO move interval into ingest()
      const imageryChecker = setInterval(() => {
        this.checkIngestionStatus(sourceUrl, status => {
          console.warn("Ingestion failed:", status);
          clearInterval(imageryChecker);
        }, status => {
          console.log("Ingestion complete:", status);
          clearInterval(imageryChecker);
        });
      }, refreshInterval);
    });
  }

  monitor() {
    const { refreshInterval } = this.props;

    this.checker = setInterval(() => {
      this.getProject(project => {
        const { pending } = this.state;

        if (pending.indexOf("cancelling") >= 0 &&
            project.status.state === "REVOKED") {
          pending.splice(pending.indexOf("cancelling"), 1);

          this.setState({
            pending,
          });
        }
      });
    }, refreshInterval);
  }

  stopMonitoring() {
    clearInterval(this.checker);
  }

  ingest(callback) {
    const { endpoint, imageryEndpoint } = this.props;
    const { project, projectName } = this.state;

    fetch(`${imageryEndpoint}/imagery/ingest?url=${encodeURIComponent(`${endpoint}/artifacts/odm_orthophoto.tif`)}`, {
      method: "POST"
    }).then(rsp => rsp.json())
      .then(rsp => {
        callback(rsp.source);

        if (project.name !== projectName) {
          // update imagery metadata
          fetch(rsp.source, {
            body: JSON.stringify({
              name: projectName,
            }),
            method: "PATCH"
          }).catch(err => console.warn(err.stack));
        }
      })
      .catch(err => console.warn(err.stack));
  }

  requestMBTiles(endpoint, failureCallback) {
    const { refreshInterval } = this.props;

    this.setState({
      tiling: true,
    });

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
                this.setState({
                  tiling: false,
                });

                clearInterval(mbtilesChecker);

                failureCallback(status);

                break;
              }

              case "SUCCESS": {
                this.setState({
                  tiling: false,
                });

                clearInterval(mbtilesChecker);

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

    const { refreshInterval } = this.props;
    const { pending } = this.state;
    const { user } = this.state.project;

    if (pending.indexOf("mbtiles") >= 0) {
      throw new Error("MBTiles generation already in process.");
    }

    if (user.imagery) {
      // imagery already ingested
      pending.push("mbtiles");

      // start spinner
      this.setState({
        pending,
      });

      // TODO do this after we know that the archive was successfully made
      this.updateMetadata({
        mbtiles: `${user.imagery}/mbtiles`
      });

      return this.requestMBTiles(user.imagery, status => {
        console.warn("MBTiles generation failed:", status);
      });
    }

    pending.push("ingesting");
    pending.push("mbtiles");

    // start spinner
    this.setState({
      pending,
    });

    // trigger ingestion
    return this.ingest(sourceUrl => {
      const imageryChecker = setInterval(() => {
        this.checkIngestionStatus(sourceUrl, status => {
          console.warn("Ingestion failed:", status);
          clearInterval(imageryChecker);
        }, status => {
          this.updateMetadata({
            imagery: sourceUrl,
            // TODO update mbtiles after we know that the archive was successfully made
            mbtiles: `${sourceUrl}/mbtiles`
          });

          clearInterval(imageryChecker);

          this.requestMBTiles(sourceUrl, status => {
            console.warn("MBTiles generation failed:", status);
          });
        });
      }, refreshInterval);
    });
  }

  process(force = false) {
    const { pending } = this.state;

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
    const { editing, project, projectName, shown } = this.state;
    const { artifacts, images, status } = project;

    const buttons = this.getButtons();
    const deleteButton = this.getDeleteButton();
    const failure = this.getFailure();
    const spinner = this.getSpinner();

    return (
      <div className="row">
        <div className="x_panel">
          <Form inline onSubmit={this.saveProject}>
            <div className="x_title">
              <h2><a tabIndex="-1" onClick={this.toggle}><i className={shown ? "fa fa-chevron-down" : "fa fa-chevron-right"} />&nbsp;</a>
                { editing ?
                  (
                    <span>
                      <input type="text" placeholder={name} value={projectName} onChange={this.updateProjectName} />
                      <Button type="submit" bsStyle="link"><i className="fa fa-check" /></Button>
                    </span>
                  ) : (
                    <span>
                      <a tabIndex="-1" onClick={this.toggle}>{projectName}</a> <a tabIndex="-1" role="button" onClick={this.editName}><i className="fa fa-pencil" /></a>
                    </span>
                  )
                }
                {failure} {spinner}</h2>

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

            {
              shown && (
                <div className="x_content">
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
                        getProject={this.getProject}
                        project={project}
                        sources={images}
                      />
                    </div>
                  </div>
                </div>
              )
            }
          </Form>
        </div>
      </div>
    );
  }
}
