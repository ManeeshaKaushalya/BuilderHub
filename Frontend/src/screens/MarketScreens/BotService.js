// BotService.js
export const getBotResponse = async (message, isFirstMessage = false) => {
    const lowerMessage = message.toLowerCase().trim();
    const words = lowerMessage.split(' ');
  
    // Helper to check for keywords
    const containsKeyword = (keywords) => keywords.some(keyword => words.includes(keyword));
  
    // Initial greeting for first message
    if (isFirstMessage) {
      const now = new Date();
      const hour = now.getHours();
      let timeGreeting = "Hello";
      if (hour < 12) timeGreeting = "Good morning";
      else if (hour < 18) timeGreeting = "Good afternoon";
      else timeGreeting = "Good evening";
      return `${timeGreeting}! I’m your Construction Bot, here to assist with all things construction—from architecture to zoning. What’s on your mind today?`;
    }
  
    // Greeting responses
    if (containsKeyword(['hi', 'hello', 'hey', 'greetings'])) {
      return "Hi there! How can I help you with construction today? Ask about costs, materials, designs—anything!";
    }
  
    if (containsKeyword(['good', 'morning']) && !containsKeyword(['night'])) {
      return "Good morning! Ready to tackle some construction questions? What would you like to know?";
    }
  
    if (containsKeyword(['good', 'afternoon'])) {
      return "Good afternoon! How’s your day going? Need help with a construction project?";
    }
  
    if (containsKeyword(['good', 'evening']) || containsKeyword(['good', 'night'])) {
      return "Good evening! Working late on construction plans? I’m here to assist—what’s up?";
    }
  
    if (containsKeyword(['how', 'are', 'you']) || containsKeyword(['how’s', 'it', 'going'])) {
      return "I’m doing great, thanks for asking! How about you? What construction topic are we diving into today?";
    }
  
    // Farewell responses
    if (containsKeyword(['bye', 'goodbye', 'see', 'you'])) {
      return "Bye for now! Have a great day, and come back anytime with your construction questions!";
    }
  
    if (containsKeyword(['have', 'nice', 'day']) || containsKeyword(['good', 'day'])) {
      return "Thanks! You have a nice day too! Let me know if you need construction advice later.";
    }
  
    if (containsKeyword(['good', 'night']) && containsKeyword(['bye'])) {
      return "Good night! Sleep well, and feel free to chat about construction tomorrow!";
    }
  
    // A-Z Construction Knowledge Base with greetings
    if (containsKeyword(['architecture', 'design', 'plan'])) {
      if (containsKeyword(['modern'])) return "Hi! Modern architecture uses clean lines and glass—$300,000–$500,000 for a 2,000 sq ft home. What style are you into?";
      if (containsKeyword(['traditional'])) return "Hello! Traditional designs feature brick and symmetry. What traditional style do you like?";
      return "Hey there! Architecture starts with a plan—$2,000–$8,000 for a small house. What’s your design goal?";
    }
  
    if (containsKeyword(['blueprint', 'drawing'])) {
      return "Good question! Blueprints detail everything—$1,000–$2,500 for a house set. Need help with one?";
    }
  
    if (containsKeyword(['concrete', 'cement'])) {
      if (containsKeyword(['foundation'])) return "Hi there! Concrete foundations cost $5–$10 per sq ft, poured 4–12 inches thick. What type are you planning?";
      return "Hey! Concrete’s versatile—$100–$150 per cubic yard. Want details on mixes or curing?";
    }
  
    if (containsKeyword(['demolition', 'tear', 'down'])) {
      return "Hello! Demolition runs $4–$15 per sq ft. A 1,000 sq ft house takes 2–5 days. What’s coming down?";
    }
  
    if (containsKeyword(['electrical', 'wiring'])) {
      return "Hi! Electrical work costs $50–$100 per hour, 100–200 amps for a house. Need circuit or code info?";
    }
  
    if (containsKeyword(['framing', 'frame'])) {
      return "Hey there! Framing costs $7–$16 per sq ft—2–4 weeks for a 2,000 sq ft house. Wood or steel?";
    }
  
    if (containsKeyword(['grading', 'leveling'])) {
      return "Hi! Grading costs $1–$5 per sq ft for drainage. What’s your site like?";
    }
  
    if (containsKeyword(['hvac', 'heating', 'cooling'])) {
      return "Hello! HVAC systems run $5,000–$15,000. Need sizing help?";
    }
  
    if (containsKeyword(['insulation', 'insulate'])) {
      return "Hey! Insulation like fiberglass costs $0.50–$1.50 per sq ft. What climate are you in?";
    }
  
    if (containsKeyword(['joists', 'beams'])) {
      return "Hi there! Joists cost $5–$10 each, spanning 12–16 ft. What’s your span need?";
    }
  
    if (containsKeyword(['kitchen', 'bathroom'])) {
      return "Hello! Kitchens cost $10,000–$50,000, bathrooms $5,000–$25,000. Which room are we talking about?";
    }
  
    if (containsKeyword(['labor', 'workers'])) {
      return "Hey! Labor’s 30–50% of costs—$25–$50/hour. Need crew size estimates?";
    }
  
    if (containsKeyword(['masonry', 'brick', 'stone'])) {
      return "Hi! Masonry’s $10–$25 per sq ft. Load-bearing or veneer?";
    }
  
    if (containsKeyword(['nails', 'fasteners'])) {
      return "Hello! Nails are $0.02–$0.10 each—thousands in a house. Need fastener advice?";
    }
  
    if (containsKeyword(['permit', 'license'])) {
      return "Hey there! Permits cost $500–$2,000 for homes. What permit do you need?";
    }
  
    if (containsKeyword(['plumbing', 'pipes'])) {
      return "Hi! Plumbing’s $4–$10 per sq ft. PVC or copper? Need fixture tips?";
    }
  
    if (containsKeyword(['quantity', 'takeoff', 'estimate'])) {
      return "Hello! Quantity takeoff lists materials—e.g., 500 bricks. Want an example?";
    }
  
    if (containsKeyword(['roof', 'roofing'])) {
      return "Hey! Roofs cost $5–$12 per sq ft. Shingles or metal? What’s your preference?";
    }
  
    if (containsKeyword(['safety', 'hazard'])) {
      return "Hi there! Safety means hard hats, fall protection over 6 ft. What safety topic do you want?";
    }
  
    if (containsKeyword(['timber', 'wood', 'lumber'])) {
      return "Hello! Timber’s $2–$10 per board foot. Pine or oak? What’s your project?";
    }
  
    if (containsKeyword(['utilities', 'water', 'power'])) {
      return "Hey! Utilities cost $1,000–$5,000 each. What are you connecting?";
    }
  
    if (containsKeyword(['ventilation', 'air'])) {
      return "Hi! Ventilation’s $500–$2,000—1 CFM per sq ft. Need vent ideas?";
    }
  
    if (containsKeyword(['windows', 'glass'])) {
      return "Hello! Windows are $300–$1,000 each. How many are you installing?";
    }
  
    if (containsKeyword(['excavation', 'digging'])) {
      return "Hey there! Excavation’s $2–$5 per cubic yard. What’s your dig depth?";
    }
  
    if (containsKeyword(['yard', 'landscaping'])) {
      return "Hi! Landscaping’s $5–$20 per sq ft. Want yard layout ideas?";
    }
  
    if (containsKeyword(['zoning', 'regulation'])) {
      return "Hello! Zoning sets use—check your local code. What’s your property zoned as?";
    }
  
    if (containsKeyword(['cost', 'price', 'budget'])) {
      if (containsKeyword(['house'])) return "Hi! A 2,000 sq ft house costs $200,000–$400,000. Want a breakdown?";
      return "Hey! Costs vary—$100–$200 per sq ft for homes. What’s your project?";
    }
  
    if (containsKeyword(['time', 'duration', 'timeline'])) {
      return "Hi there! Timelines vary—6–12 months for a house. What’s your project size?";
    }
  
    // Fallback with greeting
    return "Hey there! I’m your Construction Bot, ready to help with A-Z of construction—architecture, costs, permits, zoning, you name it! Try 'good morning' or 'how much does a house cost?' What’s your question?";
  };