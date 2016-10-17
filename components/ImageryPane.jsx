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
    pending: null,
    source: this.props.source,
  }

  componentDidMount() {
    // monitor status
    this.monitorStatus();
  }

  shouldComponentUpdate(nextProps, nextState) {
    // TODO implement these by doing a deep equality comparison on state.{pending,source}
    return true;
  }

  componentWillUnmount() {
    this.stopMonitoringStatus();
  }

  getButtons() {
    const { endpoint } = this.props;
    const { pending, source } = this.state;
    const { status } = source.meta;

    if (this.isRunning()) {
      if (pending === "cancelling") {
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
      if (pending === "processing") {
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

  getSpinner() {
    if (!this.isRunning()) {
      return null;
    }

    const { name } = this.state.source;

    return (
      <a data-toggle="modal" data-target={`.${name}-status-modal`}> <i className="fa fa-circle-o-notch fa-spin blue" /></a>
    );
  }

  cancel() {
    this.setState({
      pending: "cancelling"
    });

    const { endpoint } = this.props;

    fetch(`${endpoint}/mbtiles`, {
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
            pending: null
          });

          this.setState({
            source,
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
    this.setState({
      pending: "processing"
    });

    const { endpoint } = this.props;

    fetch(`${endpoint}/mbtiles`, {
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

  isRunning() {
    const { source } = this.state;

    return source.mbtiles != null && ["PENDING", "RUNNING"].indexOf(source.mbtiles.state) >= 0;
  }

  render() {
    const { source } = this.state;
    const { maxzoom, minzoom, name } = source;

    const bounds = [source.bounds.slice(0, 2).reverse(), source.bounds.slice(2, 4).reverse()];
    const url = source.tiles[0];

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
                      source,
                    }, null, 2), "json") }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* TODO display URL template / TileJSON URL */}
          {/* TODO make GDAL XML available for download */}
          {/* TODO default to closed and trigger leaflet.invalidateSize when opened */}
          <div className="x_content panel-collapse collapse in" id={`${name}-panel`}>
            <Map
              bounds={bounds}
              maxzoom={maxzoom}
              minzoom={minzoom}
              url={url}
            />
          </div>
        </div>
      </div>
    );
  }
}
