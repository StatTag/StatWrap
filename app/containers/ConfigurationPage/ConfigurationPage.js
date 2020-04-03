import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import Configuration from '../../components/Configuration/Configuration';
import * as CounterActions from '../../actions/counter';

function mapStateToProps(state) {
  return {
    config: state.config
  };
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators(CounterActions, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(Configuration);
