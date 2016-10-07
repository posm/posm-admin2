import React from "react";

export default class SourceThumbnail extends React.Component {
  static propTypes() {
    return {
      endpoint: React.PropTypes.string.isRequired,
      image: React.PropTypes.string.isRequired,
      name: React.PropTypes.string.isRequired,
    };
  }

  render() {
    const { endpoint, image, name } = this.props;

    return (
      <div className="col-md-2">
        <div className="thumbnail">
          <div className="image view view-first">
            <img className="img-responsive" style={{ width: "100%", display: "block" }} src={`${endpoint}/projects/${name}/images/${image}/thumb`} />
            <div className="mask">
              <p><code>{image}</code></p>
              <div className="tools tools-bottom">
                <a href={`${this.endpoint}/projects/${name}/images/${image}`}><i className="fa fa-download" /></a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
