// Environment and parameters
const gamma = 0.9;   // Discount factor for future rewards
const alpha = 0.1;   // Learning rate
const epsilon = 0.1; // Exploration rate
const episodes = 1000; // Number of episodes for training

// Define initial stocks (state)
let stocks = {
  euro: 10,
  materiel: 0,
  produit: 0,
  client_content: 0
};

// Define processes (actions)
const processes = {
  achat_materiel: { 
    consume: { euro: 8 }, 
    produce: { materiel: 1 }, 
    delay: 10 
  },
  realisation_produit: { 
    consume: { materiel: 1 }, 
    produce: { produit: 1 }, 
    delay: 30 
  },
  livraison: { 
    consume: { produit: 1 }, 
    produce: { client_content: 1 }, 
    delay: 20 
  }
};

// Initialize Q-table (states -> actions)
let Q = {};

// Helper functions
function getCurrentState(stocks) {
  return `${stocks.euro}-${stocks.materiel}-${stocks.produit}-${stocks.client_content}`;
}

// Initialize Q-table for each possible state-action pair
function initQTable() {
  for (let euro = 0; euro <= 10; euro++) {
    for (let materiel = 0; materiel <= 10; materiel++) {
      for (let produit = 0; produit <= 10; produit++) {
        for (let client_content = 0; client_content <= 10; client_content++) {
          let state = `${euro}-${materiel}-${produit}-${client_content}`;
          Q[state] = { achat_materiel: 0, realisation_produit: 0, livraison: 0 };
        }
      }
    }
  }
}

// Choose an action using epsilon-greedy policy
function chooseAction(state) {
  if (Math.random() < epsilon) {
    // Explore: choose a random action
    const actions = Object.keys(Q[state]);
    return actions[Math.floor(Math.random() * actions.length)];
  } else {
    // Exploit: choose the action with the highest Q-value
    let maxQ = Math.max(Q[state].achat_materiel, Q[state].realisation_produit, Q[state].livraison);
    return Object.keys(Q[state]).find(action => Q[state][action] === maxQ);
  }
}

// Perform the action, update the stocks, and return reward
function performAction(action, stocks) {
  const process = processes[action];
  
  // Check if the action can be performed (i.e., enough resources)
  let canPerform = true;
  for (const [resource, amount] of Object.entries(process.consume)) {
    if (stocks[resource] < amount) {
      canPerform = false;
      break;
    }
  }

  if (canPerform) {
    // Update stocks by consuming and producing resources
    for (const [resource, amount] of Object.entries(process.consume)) {
      stocks[resource] -= amount;
    }
    for (const [resource, amount] of Object.entries(process.produce)) {
      stocks[resource] += amount;
    }

    // Calculate reward: prioritize client_content
    let reward = process.produce.client_content || 0;
    return reward;
  }

  // Return negative reward if the action cannot be performed
  return -100;
}

// Q-Learning algorithm
function trainQLearning() {
  initQTable();
  
  for (let episode = 0; episode < episodes; episode++) {
    // Reset stocks to initial values at the start of each episode
    let currentStocks = { ...stocks };
    
    for (let step = 0; step < 100; step++) {
      let state = getCurrentState(currentStocks);
      
      // Choose an action
      let action = chooseAction(state);
      
      // Perform the action and get reward
      let reward = performAction(action, currentStocks);
      
      // Get new state
      let newState = getCurrentState(currentStocks);
      
      // Update Q-value using the Q-learning formula
      let maxFutureQ = Math.max(Q[newState].achat_materiel, Q[newState].realisation_produit, Q[newState].livraison);
      Q[state][action] = Q[state][action] + alpha * (reward + gamma * maxFutureQ - Q[state][action]);
      
      // End the episode if all client_content is produced or no more actions are possible
      if (currentStocks.euro <= 0 && currentStocks.materiel <= 0 && currentStocks.produit <= 0) {
        break;
      }
    }
  }
}

// Start the training
trainQLearning();

// Output the best policy
console.log(Q);
