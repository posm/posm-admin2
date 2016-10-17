import React from "react";

export default class ModalHeader extends React.Component {
  static propTypes() {
    return {
      labelId: React.PropTypes.string.isRequired,
      title: React.PropTypes.string,
    };
  }

  render() {
    const { labelId, title } = this.props;

    return (
      <div className="modal-header">
        <button type="button" className="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
        <h4 className="modal-title" id={labelId}>{title}</h4>
      </div>
    );
  }
}
