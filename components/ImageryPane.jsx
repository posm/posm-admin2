import React from "react";

import highlight from "../utils/highlight";
import Map from "./Map";

export default class ImageryPane extends React.Component {
  static defaultProps = {
    refreshInterval: 10000
  }

  static propTypes() {
    return {
      endpoint: React.PropTypes.string.isRequired,
      refreshInterval: React.PropTypes.integer,
      source: React.PropTypes.object.isRequired,
    };
  }

  constructor(props) {
    super(props);

    this.cancel = this.cancel.bind(this);
    this.makeMBTiles = this.makeMBTiles.bind(this);
  }

  state = {
    pending: [],
    showSpinner: ["PENDING", "RUNNING"].indexOf(this.props.source.meta.status.ingest.state) >= 0,
    source: this.props.source,
  }

  componentDidMount() {
    this.monitor();
  }

  shouldComponentUpdate(nextProps, nextState) {
    // TODO implement these by doing a deep equality comparison on state.{pending,source}
    return true;
  }

  componentWillUpdate(nextProps, nextState) {
    const nextIngestionStatus = nextState.source.meta.status.ingest;
    const ingestionStatus = this.state.source.meta.status.ingest;
    const nextTilingStatus = nextState.source.meta.status.mbtiles;
    const tilingStatus = this.state.source.meta.status.mbtiles;

    if (["SUCCESS", "FAILURE"].indexOf(nextIngestionStatus.state) >= 0 &&
        nextIngestionStatus.state !== ingestionStatus.state) {
      this.setState({
        showSpinner: false,
      });
    }

    if (["SUCCESS", "FAILURE"].indexOf(nextTilingStatus.state) >= 0 &&
        nextTilingStatus.state !== tilingStatus.state) {
      this.setState({
        showSpinner: false,
      });
    }

    // clear pending states; we're all caught up
    if (nextState.source !== this.state.source) {
      this.setState({
        pending: [],
      });
    }
  }

  componentWillUnmount() {
    this.stopMonitoring();
  }

  getButtons() {
    const { endpoint } = this.props;
    const { pending, source } = this.state;
    const { status } = source.meta;

    if (this.isIngesting()) {
      return (
        <button type="button" className="btn btn-dark btn-sm">Ingesting <i className="fa fa-circle-o-notch fa-spin" /></button>
      );
    }

    if (this.isTiling()) {
      if (pending.indexOf("cancelling") >= 0) {
        return (
          <button type="button" className="btn btn-warning btn-sm">Cancelling <i className="fa fa-circle-o-notch fa-spin" /></button>
        );
      }

      return (
        <button type="button" className="btn btn-warning btn-sm" onClick={this.cancel}>Cancel</button>
      );
    }

    switch (status.ingest.state) {
    case "SUCCESS": {
      if (pending.indexOf("processing") >= 0) {
        return (
          <button type="button" className="btn btn-primary btn-sm">Processing <i className="fa fa-circle-o-notch fa-spin" /></button>
        );
      }

      if (status.mbtiles.state !== "SUCCESS") {
        return (
          <button type="button" className="btn btn-success btn-sm" onClick={this.makeMBTiles}>Make MBTiles</button>
        );
      }

      return (
        <a href={`${endpoint}/mbtiles`} role="button" className="btn btn-success btn-sm">Download MBTiles</a>
      );
    }

    default: {
      return (
        <button type="button" className="btn btn-danger btn-sm">Failed</button>
      );
    }
    }
  }

  getFailure() {
    const { status } = this.state.source.meta;

    if (status.ingest.state !== "FAILURE" &&
        status.mbtiles.state !== "FAILURE") {
      return null;
    }

    return (
      <a data-toggle="modal" data-target={`.${name}-status-modal`}> <i className="fa fa-exclamation-triangle red" /></a>
    );
  }

  getMap() {
    if (!this.isReady()) {
      return null;
    }

    const { source } = this.state;
    const { maxzoom, minzoom, name } = source;

    const bounds = [source.bounds.slice(0, 2).reverse(), source.bounds.slice(2, 4).reverse()];
    const url = source.tiles[0];
    // TODO display URL template / TileJSON URL
    // TODO make GDAL XML available for download
    // TODO default to closed and trigger leaflet.invalidateSize when opened
    return (
      <div className="x_content panel-collapse collapse in" id={`${name}-panel`}>
        <Map
          bounds={bounds}
          maxzoom={maxzoom}
          minzoom={minzoom}
          url={url}
        />
      </div>
    );
  }

  getSpinner() {
    if (this.shouldShowSpinner()) {
      const { name } = this.state.source;

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
    let { pending } = this.state;

    if (pending.indexOf("cancelling") >= 0) {
      throw new Error("Already cancelling.");
    }

    pending.push("cancelling");

    this.setState({
      pending,
    });

    const { endpoint } = this.props;

    fetch(`${endpoint}/mbtiles`, {
      method: "DELETE",
    }).then(rsp => {
      console.log("rsp:", rsp);

      pending = this.state.pending;
      pending.splice(pending.indexOf("cancelling"), 1);

      this.setState({
        pending,
      });

      if (rsp.status >= 400) {
        // TODO display the underlying error message
        throw new Error("Failed.");
      }
    }).catch(err => {
      console.warn(err.stack);
    });
  }

  monitor() {
    const { endpoint, refreshInterval } = this.props;

    this.statusChecker = setInterval(() => {
      fetch(endpoint)
        .then(rsp => {
          if (!rsp.ok) {
            console.log("bad response");
          }

          return rsp.json();
        })
        .then(source => {
          this.setState({
            source,
          });
        })
        .catch(err => {
          console.warn(err.stack);
        });
    }, refreshInterval);
  }

  stopMonitoring() {
    clearInterval(this.statusChecker);
  }

  makeMBTiles() {
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

    fetch(`${endpoint}/mbtiles`, {
      method: "POST",
    }).then(rsp => {
      if (rsp.status >= 400) {
        // TODO display the underlying error message
        throw new Error("Failed.");
      }
    }).catch(err => {
      console.warn(err.stack);
    });
  }

  isReady() {
    const { ingest } = this.state.source.meta.status;

    return ingest.state === "SUCCESS";
  }

  isIngesting() {
    const { ingest } = this.state.source.meta.status;

    return ["PENDING", "RUNNING"].indexOf(ingest.state) >= 0;
  }

  isTiling() {
    const { mbtiles } = this.state.source.meta.status;

    return ["PENDING", "RUNNING"].indexOf(mbtiles.state) >= 0;
  }

  isRunning() {
    return this.isIngesting() || this.isTiling();
  }

  render() {
    const { source } = this.state;
    const { name } = source;

    // TODO delete button
    const buttons = this.getButtons();
    const failure = this.getFailure();
    const spinner = this.getSpinner();
    const map = this.getMap();

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
                      source,
                    }, null, 2), "json") }}
                  />
                </div>
              </div>
            </div>
          </div>

          {map}
        </div>
      </div>
    );
  }
}
