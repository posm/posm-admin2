import $ from "jquery";
import React from "react";

export default class Modal extends React.Component {
  static propTypes() {
    return {
      children: React.PropTypes.any,
      id: React.PropTypes.string.isRequired,
      onHidden: React.PropTypes.func,
      onHide: React.PropTypes.func,
      onShow: React.PropTypes.func,
      onShown: React.PropTypes.func,
      onLoaded: React.PropTypes.func,
    };
  }

  componentDidMount() {
    const { onHidden, onHide, onLoaded, onShow, onShown } = this.props;

    $(this.container).on("show.bs.modal", onShow);
    $(this.container).on("shown.bs.modal", onShown);
    $(this.container).on("hidden.bs.modal", onHidden);
    $(this.container).on("hide.bs.modal", onHide);
    $(this.container).on("loaded.bs.modal", onLoaded);
  }

  render() {
    const { id } = this.props;
    const labelId = `${id}Label`;

    const childrenWithProps = React.Children.map(this.props.children,
                                child => React.cloneElement(child, { labelId })
                              );

    return (
      <div className="modal fade" id={id} tabIndex="-1" role="dialog" aria-labelledby={labelId} ref={(c) => (this.container = c)}>
        <div className="modal-dialog" role="document">
          <div className="modal-content">
            {childrenWithProps}
            {/* React.cloneElement(children, { labelId }) */}
          </div>
        </div>
      </div>
    );
  }
}
