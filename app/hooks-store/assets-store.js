import { initStore } from './store';

const configureStore = () => {
  const actions = {
    SELECT_ASSET: (currentState, assetId) => {
      return { selectedAsset: assetId };
    },
  };

  initStore(actions, { selectedAsset: null });
};

export default configureStore;
