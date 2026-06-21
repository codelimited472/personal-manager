import { getDB } from './db';
import { v4 as uuidv4 } from 'uuid';
import { getToday } from './utils';

export interface ParsedCapture {
  type: 'task' | 'habit' | 'expense' | 'water' | 'idea' | 'note' | 'document' | 'vehicle_issue' | 'capture';
  data: any;
  message: string;
}

export async function processQuickCapture(text: string): Promise<ParsedCapture> {
  const cleanText = text.trim();
  const lowerText = cleanText.toLowerCase();
  const db = getDB();
  const userId = 'local-user';

  // 1. Water Intake (e.g., "water 250ml", "drank 500 ml")
  const waterMatch = lowerText.match(/(?:water|drank|drink)\s*(\d+)\s*(?:ml|liters|l)?/i) || lowerText.match(/(\d+)\s*(?:ml|l)\s*(?:water)?/i);
  if (waterMatch) {
    let amount = parseInt(waterMatch[1], 10);
    if (waterMatch[0].includes('l') && !waterMatch[0].includes('ml')) {
      amount = amount * 1000; // Convert Liters to ml
    }
    const log = {
      id: uuidv4(),
      user_id: userId,
      date: getToday(),
      amount,
      created_at: new Date().toISOString(),
      _syncStatus: 'pending' as const,
    };
    await db.waterLogs.add(log);
    return {
      type: 'water',
      data: log,
      message: `Logged ${amount}ml of water intake!`,
    };
  }

  // 2. Expense (e.g., "spent 50 on fuel", "add petrol expense 30", "50 for food")
  const expenseMatch = lowerText.match(/(?:spent|spend|cost|expense|add)\s*(\d+(?:\.\d+)?)\s*(?:on|for)?\s*([a-zA-Z0-9\s]+)/i) || 
                       lowerText.match(/(\d+(?:\.\d+)?)\s*(?:on|for)\s*([a-zA-Z0-9\s]+)/i);
  if (expenseMatch) {
    const amount = parseFloat(expenseMatch[1]);
    const details = expenseMatch[2].trim();
    let category = 'Miscellaneous';
    if (details.includes('fuel') || details.includes('petrol') || details.includes('gas') || details.includes('car')) category = 'Fuel';
    else if (details.includes('food') || details.includes('biryani') || details.includes('dosa') || details.includes('dinner') || details.includes('lunch')) category = 'Food';
    else if (details.includes('shopping') || details.includes('clothes') || details.includes('shoes')) category = 'Shopping';
    else if (details.includes('bill') || details.includes('utility') || details.includes('rent') || details.includes('electricity')) category = 'Utilities';
    else if (details.includes('movie') || details.includes('game') || details.includes('fun')) category = 'Entertainment';
    else if (details.includes('medicine') || details.includes('doctor') || details.includes('health')) category = 'Medical';
    else if (details.includes('flight') || details.includes('train') || details.includes('trip')) category = 'Travel';

    const expense = {
      id: uuidv4(),
      user_id: userId,
      amount,
      category,
      description: details,
      date: getToday(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      _syncStatus: 'pending' as const,
    };
    await db.expenses.add(expense);
    return {
      type: 'expense',
      data: expense,
      message: `Logged expense of $${amount} under ${category}!`,
    };
  }

  // 3. Document Vault (e.g., "passport expires on 2028-12-31", "aadhaar details")
  if (lowerText.includes('expires') && (lowerText.includes('passport') || lowerText.includes('insurance') || lowerText.includes('license') || lowerText.includes('visa'))) {
    const expiryMatch = lowerText.match(/(?:in|on|at|by)?\s*(\d{4}(?:-\d{2}-\d{2})?)/);
    let expiry_date = undefined;
    if (expiryMatch) {
      expiry_date = expiryMatch[1].length === 4 ? `${expiryMatch[1]}-12-31` : expiryMatch[1];
    }
    let category: string = 'other';
    if (lowerText.includes('passport')) category = 'passport';
    else if (lowerText.includes('insurance')) category = 'insurance';
    else if (lowerText.includes('license')) category = 'license';
    else if (lowerText.includes('aadhaar')) category = 'aadhaar';

    const doc = {
      id: uuidv4(),
      user_id: userId,
      name: cleanText,
      category,
      expiry_date,
      created_at: new Date().toISOString(),
      _syncStatus: 'pending' as const,
    };
    await db.documents.add(doc as any);
    return {
      type: 'document',
      data: doc,
      message: `Saved document alert for "${cleanText}"!`,
    };
  }

  // 4. Vehicle Issue (e.g., "car making strange noise", "bike tyre punch")
  if (lowerText.includes('car') || lowerText.includes('bike') || lowerText.includes('vehicle') || lowerText.includes('engine') || lowerText.includes('brake') || lowerText.includes('tyre')) {
    if (lowerText.includes('noise') || lowerText.includes('issue') || lowerText.includes('leak') || lowerText.includes('broken') || lowerText.includes('repair') || lowerText.includes('puncture') || lowerText.includes('strange')) {
      const issue = {
        id: uuidv4(),
        vehicle_id: 'default-vehicle-id', // Placeholder or first vehicle
        title: cleanText,
        description: 'Auto-captured from Quick Add',
        status: 'open' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        _syncStatus: 'pending' as const,
      };
      await db.vehicleIssues.add(issue);
      return {
        type: 'vehicle_issue',
        data: issue,
        message: `Logged vehicle issue: "${cleanText}"!`,
      };
    }
  }

  // 5. Ideas (e.g., "idea: start blog", "new app business idea")
  if (lowerText.includes('idea')) {
    const idea = {
      id: uuidv4(),
      user_id: userId,
      title: cleanText.replace(/idea:/i, '').trim(),
      description: 'Quick Capture Idea',
      category: 'General',
      tags: ['quick-capture'],
      status: 'new' as const,
      created_at: new Date().toISOString(),
      _syncStatus: 'pending' as const,
    };
    await db.ideas.add(idea);
    return {
      type: 'idea',
      data: idea,
      message: `Added new idea: "${idea.title}"!`,
    };
  }

  // 6. Habit (e.g., "habit: meditate every day", "read daily")
  if (lowerText.includes('habit') || lowerText.includes('daily') || lowerText.includes('weekly') || lowerText.includes('meditate') || lowerText.includes('exercise')) {
    const frequency = lowerText.includes('weekly') ? 'weekly' as const : 'daily' as const;
    const name = cleanText.replace(/habit:/i, '').replace(/daily/i, '').replace(/weekly/i, '').trim();
    const habit = {
      id: uuidv4(),
      user_id: userId,
      name: name || 'New Habit',
      description: 'Quick Capture Habit',
      frequency,
      color: '#7c6cf0',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      _syncStatus: 'pending' as const,
    };
    await db.habits.add(habit);
    return {
      type: 'habit',
      data: habit,
      message: `Created habit: "${habit.name}"!`,
    };
  }

  // 7. Task (e.g., "buy milk tomorrow", "call mom at 5pm", "todo: clean room")
  const tomorrowKeywords = ['tomorrow', 'tmw'];
  let due_date = undefined;
  if (tomorrowKeywords.some(kw => lowerText.includes(kw))) {
    const tmw = new Date();
    tmw.setDate(tmw.getDate() + 1);
    due_date = tmw.toISOString().split('T')[0];
  } else if (lowerText.includes('today')) {
    due_date = getToday();
  }

  const title = cleanText.replace(/todo:/i, '').replace(/tomorrow/i, '').replace(/today/i, '').trim();

  // If it's a simple text with verbs/actions, log it as a Task, otherwise default to a general Note capture
  const actionVerbs = ['buy', 'call', 'clean', 'get', 'send', 'check', 'do', 'go', 'meet', 'pay', 'schedule', 'todo', 'task'];
  const isActionTask = actionVerbs.some(verb => lowerText.startsWith(verb)) || lowerText.includes('todo') || due_date !== undefined;

  if (isActionTask) {
    const task = {
      id: uuidv4(),
      user_id: userId,
      title: title || 'New Task',
      priority: 'medium' as const,
      category: 'personal' as const,
      status: 'pending' as const,
      is_recurring: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      due_date,
      _syncStatus: 'pending' as const,
    };
    await db.tasks.add(task);
    return {
      type: 'task',
      data: task,
      message: `Created task: "${task.title}"${due_date ? ` due ${due_date}` : ''}!`,
    };
  }

  // 8. Capture/Note default
  const note = {
    id: uuidv4(),
    user_id: userId,
    title: cleanText.split('\n')[0].substring(0, 40) || 'Quick Note',
    content: cleanText,
    tags: ['quick-capture'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    _syncStatus: 'pending' as const,
  };
  await db.notes.add(note);
  return {
    type: 'note',
    data: note,
    message: `Saved note: "${note.title}"!`,
  };
}
