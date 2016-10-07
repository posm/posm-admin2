import React from "react";

import SourceThumbnail from "./SourceThumbnail";

export default class ProjectSourcesPanel extends React.Component {
  static defaultProps = {
    count: 6
  }

  static propTypes() {
    return {
      active: React.PropTypes.bool.isRequired,
      count: React.PropTypes.integer,
      name: React.PropTypes.string.isRequired,
      sources: React.PropTypes.array.isRequired,
    };
  }

  constructor(props) {
    super(props);

    this.showAll = this.showAll.bind(this);
  }

  state = {
    count: this.props.count
  }

  getShowAllButton() {
    const showAll = this.showAll;

    if (this.state.count === Infinity) {
      return null;
    }

    return (
      <div className="row">
        <div className="col-md-12">
          <button onClick={showAll} type="button" className="btn btn-info btn-sm">Show All</button>
        </div>
      </div>
    );
  }

  showAll() {
    this.setState({
      count: Infinity
    });
  }

  render() {
    const { active, name, sources } = this.props;
    const { count } = this.state;

    const thumbnails = sources.slice(0, count).map((image, col) => (
      <SourceThumbnail key={col} image={image} {...this.props} />
    ));

    const showAllButton = this.getShowAllButton();

    return (
      <div role="tabpanel" className={active ? "tab-pane fade active in" : "tab-pane fade"} id={`${name}_images`} aria-labelledby={`${name}-images-tab`}>
        <div className="row sources">
          {thumbnails}
        </div>

        {showAllButton}
      </div>
    );
  }
}
