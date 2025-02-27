import { firestore } from '../../../firebase/firebaseConfig';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';

export const getBotResponse = async (message, isFirstMessage = false) => {
  const lowerMessage = message.toLowerCase().trim();
  const words = lowerMessage.split(' ');

  // Helper to check for keywords
  const containsKeyword = (keywords) =>
    keywords.some((keyword) => words.includes(keyword) || lowerMessage.includes(keyword));
  
  const containsAllKeywords = (keywords) =>
    keywords.every((keyword) => words.includes(keyword) || lowerMessage.includes(keyword));

  // Categories from AddItem
  const categories = ["paints", "machines", "tools", "furniture"];

  // Fetch items for sale from the items collection with more details
  const fetchItemsForSale = async (categoryKeywords, specificItem = null) => {
    try {
      const itemsRef = collection(firestore, 'items');
      let q;
      
      if (specificItem) {
        q = query(
          itemsRef,
          where('category', 'in', categoryKeywords.map(k => k.charAt(0).toUpperCase() + k.slice(1))),
          where('Stock', '>', 0),
          orderBy('price')
        );
      } else {
        q = query(
          itemsRef,
          where('category', 'in', categoryKeywords.map(k => k.charAt(0).toUpperCase() + k.slice(1))),
          where('Stock', '>', 0),
          orderBy('price'),
          limit(4)
        );
      }
      
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const filteredItems = specificItem 
        ? items.filter(item => item.itemName?.toLowerCase().includes(specificItem.toLowerCase()))
        : items;

      if (filteredItems.length === 0) {
        return `I couldn't find any ${specificItem || categoryKeywords[0]} items in stock right now. Would you like to see other ${categoryKeywords[0]} options instead?`;
      }

      const itemDetails = filteredItems.slice(0, 4).map(item => {
        return `- "${item.itemName || 'Unnamed Item'}" by ${item.company}, ${item.color}, Rs. ${item.price.toLocaleString()}, ${item.Stock} in stock${item.images?.length > 0 ? ` (Image: ${item.images[0]})` : ''}`;
      }).join('\n');

      const categoryName = categoryKeywords[0].charAt(0).toUpperCase() + categoryKeywords[0].slice(1);
      
      if (specificItem) {
        return `Here are the ${specificItem} options I found in our ${categoryName} collection:\n${itemDetails}\n\nWould you like more details about any of these items?`;
      } else {
        return `Here are some popular ${categoryName} items available right now:\n${itemDetails}\n\nWould you like to see more specific ${categoryKeywords[0]} or ask about a particular type?`;
      }
    } catch (error) {
      console.error("Error fetching items for sale:", error);
      return "I apologize, but I encountered an issue retrieving the inventory information. Would you like some general advice about construction materials instead?";
    }
  };

  // Initial greeting with time-based personalization
  if (isFirstMessage) {
    const now = new Date();
    const hour = now.getHours();
    let timeGreeting = "Hello";
    if (hour < 12) timeGreeting = "Good morning";
    else if (hour < 18) timeGreeting = "Good afternoon";
    else timeGreeting = "Good evening";
    
    return `${timeGreeting}! I'm your Construction Assistant, ready to help with all aspects of construction projects. I can provide information on materials, techniques, cost estimates, and show you our available inventory of paints, machines, tools, and furniture. What can I help you with today?`;
  }

  // Enhanced greeting responses
  if (containsKeyword(['hi', 'hello', 'hey', 'greetings'])) {
    return "Hi there! How can I assist with your construction needs today? Whether it’s advice or checking our inventory of paints, machines, tools, or furniture, I’m here for you!";
  }

  if (containsAllKeywords(['good', 'morning'])) {
    return "Good morning! It’s a great day to work on your construction projects. Need info on materials or want to see what’s in stock—like paints or tools?";
  }

  if (containsAllKeywords(['good', 'afternoon'])) {
    return "Good afternoon! How’s your day going? I can help with construction tips or show you what’s available in our inventory—paints, machines, anything you need!";
  }

  if (containsAllKeywords(['good', 'evening']) || containsAllKeywords(['good', 'night'])) {
    return "Good evening! Planning some late-night construction ideas? Ask me about techniques or check out our inventory of tools and materials!";
  }

  if (
    containsKeyword(['how', 'are', 'you']) || 
    containsKeyword(['hows', 'it', 'going']) || 
    lowerMessage.includes("how's it going")
  ) {
    return "I’m doing great, thanks for asking! How about you? Ready to dive into construction questions or browse our inventory of paints and tools?";
  }

  // Farewell responses
  if (containsKeyword(['bye', 'goodbye', 'see', 'you'])) {
    return "Goodbye! Have a fantastic day, and feel free to return anytime for construction help or to check our inventory!";
  }

  if (containsKeyword(['have', 'nice', 'day']) || containsKeyword(['good', 'day'])) {
    return "Thanks! You have a nice day too! I’ll be here if you need construction advice or want to browse our items later.";
  }

  if (containsAllKeywords(['good', 'night']) && containsKeyword(['bye'])) {
    return "Good night! Sleep well, and come back tomorrow for more construction insights or to see what’s in stock!";
  }

  // Materials queries with enhanced responses
  if (containsKeyword(['materials', 'material'])) {
    if (containsKeyword(['compare', 'best', 'recommend', 'recommendation'])) {
      return "When selecting construction materials, consider durability, cost, and application. For exterior work, treated lumber, fiber cement, and brick offer excellent longevity. For interiors, drywall, engineered wood, and ceramic tile are popular choices. Would you like specific recommendations for a particular area of your project?";
    }
    return "Construction materials vary widely based on application. Common categories include structural (concrete, steel, wood), finishing (drywall, paint, tile), insulation, and specialty materials. Are you looking for information on a specific type of material or would you like to see what's available in our inventory?";
  }

  // Specific material categories with enhanced information
  if (containsKeyword(['paints', 'paint'])) {
    if (containsKeyword(['sale', 'sell', 'available', 'for', 'buy', 'purchase', 'stock'])) {
      if (containsKeyword(['latex', 'water-based'])) {
        return await fetchItemsForSale(['paints'], 'latex');
      }
      if (containsKeyword(['oil', 'oil-based'])) {
        return await fetchItemsForSale(['paints'], 'oil');
      }
      if (containsKeyword(['exterior'])) {
        return await fetchItemsForSale(['paints'], 'exterior');
      }
      if (containsKeyword(['interior'])) {
        return await fetchItemsForSale(['paints'], 'interior');
      }
      return await fetchItemsForSale(['paints']);
    }
    
    if (containsKeyword(['type', 'types', 'kind', 'kinds'])) {
      return "Hi! There are several types of paints for construction: (1) Latex paints are water-based, quick-drying, and low-odor, ideal for interior walls; (2) Oil-based paints offer durability and moisture resistance, great for trim; (3) Enamel paints provide a hard, glossy finish; (4) Specialty paints include chalk or anti-mold options. Want to see what’s in stock?";
    }
    
    if (containsKeyword(['cost', 'price'])) {
      return "Hey! Paint prices vary: Economy paints range from Rs. 150-300 per liter, mid-range from Rs. 300-600, and premium from Rs. 600-1,500. Specialty paints can hit Rs. 1,000-2,500. Want to check what’s available in the app?";
    }
    
    return "Hello! Paints come in various formulations—latex for walls, oil-based for durability. Finishes range from flat to high-gloss. Want specifics, application tips, or to see what’s for sale?";
  }

  if (containsKeyword(['machines', 'machine', 'equipment'])) {
    if (containsKeyword(['sale', 'sell', 'available', 'for', 'buy', 'purchase', 'stock'])) {
      if (containsKeyword(['excavator', 'excavators'])) {
        return await fetchItemsForSale(['machines'], 'excavator');
      }
      if (containsKeyword(['mixer', 'mixers', 'concrete mixer'])) {
        return await fetchItemsForSale(['machines'], 'mixer');
      }
      if (containsKeyword(['drill', 'drills', 'drilling'])) {
        return await fetchItemsForSale(['machines'], 'drill');
      }
      return await fetchItemsForSale(['machines']);
    }
    
    if (containsKeyword(['rent', 'rental', 'lease'])) {
      return "Hi there! Renting machines can save costs: Small excavators (Rs. 5,000-10,000/day), concrete mixers (Rs. 1,000-2,500/day), power tools (Rs. 500-1,500/day). Want to see purchase options instead?";
    }
    
    return "Hey! Machines like excavators and mixers are key for construction. Need info on types, rentals, or what’s in stock?";
  }

  if (containsKeyword(['tools', 'tool'])) {
    if (containsKeyword(['sale', 'sell', 'available', 'for', 'buy', 'purchase', 'stock'])) {
      if (containsKeyword(['power', 'power tools'])) {
        return await fetchItemsForSale(['tools'], 'power');
      }
      if (containsKeyword(['hand', 'hand tools'])) {
        return await fetchItemsForSale(['tools'], 'hand');
      }
      if (containsKeyword(['measuring', 'measurement'])) {
        return await fetchItemsForSale(['tools'], 'measuring');
      }
      return await fetchItemsForSale(['tools']);
    }
    
    return "Hello! Tools range from hand tools to power tools. Essentials include drills, saws, and measuring devices. Want specifics or to see what’s available?";
  }

  if (containsKeyword(['furniture'])) {
    if (containsKeyword(['sale', 'sell', 'available', 'for', 'buy', 'purchase', 'stock'])) {
      if (containsKeyword(['office', 'desk', 'chair'])) {
        return await fetchItemsForSale(['furniture'], 'office');
      }
      if (containsKeyword(['storage', 'cabinet', 'shelf'])) {
        return await fetchItemsForSale(['furniture'], 'storage');
      }
      return await fetchItemsForSale(['furniture']);
    }
    
    return "Hi! Furniture for construction includes jobsite storage and office pieces. Want details or to check our inventory?";
  }

  // Construction Process Questions
  if (containsKeyword(['process', 'steps', 'stages', 'phases'])) {
    return "Hi there! Construction involves planning, site prep, framing, systems installation, finishing, and inspection. Want details on a specific stage?";
  }

  // Architecture and Design
  if (containsKeyword(['architecture', 'design', 'plan', 'blueprint'])) {
    return "Hey! Architecture starts with a plan—$2,000–$8,000 for a small house. Need design tips or cost info?";
  }

  // Budget and Costs
  if (containsKeyword(['cost', 'price', 'budget', 'estimate', 'quote'])) {
    if (containsKeyword(['house', 'home', 'residential'])) {
      return "Hi! A 2,000 sq ft house costs Rs. 6,000,000-12,000,000. Want a breakdown?";
    }
    return "Hey! Costs vary by project—Rs. 3,000-6,000/sq ft for homes. What’s your project type?";
  }

  // Fallback with enhanced greeting
  return "Hello! I’m your Construction Assistant, here to help with materials, techniques, costs, and our inventory of paints, machines, tools, and furniture. Try 'good morning,' 'paints for sale,' or 'how’s it going?' What can I do for you today?";
};