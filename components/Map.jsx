import React from "react";
import Col from "react-bootstrap/lib/Col";

import "leaflet/dist/leaflet.css";

import { config } from "config";

const MEDIA_QUERY = `(-webkit-min-device-pixel-ratio: 1.5),
                     (min--moz-device-pixel-ratio: 1.5),
                     (-o-min-device-pixel-ratio: 3/2),
                     (min-resolution: 1.5dppx)`;

export default class Map extends React.Component {
  static propTypes() {
    return {
      bounds: React.PropTypes.array.isRequired,
      maxzoom: React.PropTypes.integer.isRequired,
      minzoom: React.PropTypes.integer.isRequired,
      url: React.PropTypes.string.isRequired,
    };
  }

  constructor(props) {
    super(props);

    this.updateOpacity = this.updateOpacity.bind(this);
  }

  state = {
    opacity: 100,
  }

  componentDidMount() {
    const { bounds, maxzoom, minzoom } = this.props;
    let { url } = this.props;
    let { backgroundTileLayer } = config;

    // Leaflet needs to be required here so that it's not available in a server context
    const Leaflet = require("leaflet");

    if (window.devicePixelRatio > 1 ||
        (window.matchMedia && window.matchMedia(MEDIA_QUERY).matches)) {
      backgroundTileLayer = backgroundTileLayer.replace(/\.(?!.*\.)/, "@2x.");
      url = url.replace(/\.(?!.*\.)/, "@2x.");
    }

    this.imageryLayer = Leaflet.tileLayer(url, {
      minZoom: minzoom,
      maxZoom: maxzoom,
    });

    this.leaflet = Leaflet.map(this.container, {
      scrollWheelZoom: false,
      maxZoom: maxzoom,
      layers: [
        Leaflet.tileLayer(backgroundTileLayer),
        this.imageryLayer,
      ]
    });

    this.leaflet.fitBounds(bounds);

    Leaflet.control.scale({
      maxWidth: 250,
    }).addTo(this.leaflet);
    this.leaflet.attributionControl.setPrefix("");
  }

  componentDidUpdate() {
    this.imageryLayer.setOpacity(this.state.opacity / 100);
  }

  componentWillUnmount() {
    this.leaflet.remove();
  }

  updateOpacity(evt) {
    this.setState({
      opacity: evt.target.value,
    });
  }

  render() {
    const { opacity } = this.state;

    return (
      <div>
        <div
          ref={(c) => (this.container = c)}
          style={{ width: "100%", height: "500px" }}
        />
        <div className="row">
          <Col md={3}>
            <input type="range" step="10" value={opacity} onChange={this.updateOpacity} />
          </Col>
        </div>
      </div>
    );
  }
}
