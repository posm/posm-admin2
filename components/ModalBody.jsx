import React from "react";

export default class ModalBody extends React.Component {
  static propTypes() {
    return {
      children: React.PropTypes.any,
    };
  }

  render() {
    return (
      <div className="modal-body">
        {this.props.children}
      </div>
    );
  }
}
