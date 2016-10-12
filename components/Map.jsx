import React from "react";

import "leaflet/dist/leaflet.css";

export default class Map extends React.Component {
  static propTypes() {
    return {
      bounds: React.PropTypes.array.isRequired,
      maxzoom: React.PropTypes.integer.isRequired,
      minzoom: React.PropTypes.integer.isRequired,
      url: React.PropTypes.string.isRequired,
    };
  }

  componentDidMount() {
    const { bounds, maxzoom, minzoom, url } = this.props;

    // Leaflet needs to be required here so that it's not available in a server context
    const Leaflet = require("leaflet");

    // TODO retina

    this.leaflet = Leaflet.map(this.container, {
      scrollWheelZoom: false,
      layers: [
        Leaflet.tileLayer(url, {
          minZoom: minzoom,
          maxZoom: maxzoom,
        }),
      ]
    });

    this.leaflet.fitBounds(bounds);

    this.leaflet.attributionControl.setPrefix("");
  }

  componentWillUnmount() {
    this.leaflet.remove();
  }

  render() {
    return (
      <div
        ref={(c) => (this.container = c)}
        style={{ width: "100%", height: "500px" }}
      />
    );
  }
}
