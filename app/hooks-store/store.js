import { useState, useEffect } from 'react';

let globalState = {};
let listeners = [];
let actions = {};

export const useStore = () => {
  const setState = useState(globalState)[1];

  const dispatch = (actionIdentifier, payload) => {
    const newState = actions[actionIdentifier](globalState, payload);
    globalState = { ...globalState, ...newState }; // Merge new state with old global state

    // Inform listeners of state update
    listeners.forEach(l => l(globalState));
    // for (const listener of listeners) {
    //   listener(globalState);
    // }
  };

  useEffect(() => {
    // Register on component mount
    listeners.push(setState);

    return () => {
      // Remove listener when component unmounts
      listeners = listeners.filter(li => li !== setState);
    };
  }, [setState]);

  return [globalState, dispatch];
};

/**
 * Initialize the store with the specified actions and optional initial state
 * @param {object} userActions Defined by the developer
 * @param {object} initialState State values known ahead of time (optional)
 */
export const initStore = (userActions, initialState) => {
  if (initialState) {
    globalState = { ...globalState, ...initialState };
  }
  actions = { ...actions, ...userActions };
};
