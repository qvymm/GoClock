import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Bell,
  Camera,
  ChevronRight,
  Clock3,
  Image as ImageIcon,
  Info,
  Minus,
  PenLine,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import type { Meal } from '../lib/supabase';
import { supabase } from '../lib/supabase';
import { useApp } from '../lib/AppContext';
import styles from './NutritionScreen.module.css';

type MealType = Meal['meal_type'];
type MealKey = 'breakfast' | 'lunch' | 'snack' | 'dinner';
type SheetView = 'menu' | 'search' | 'busy' | 'confirm' | 'remind';
type MacroValues = { calories: string; protein: string; carbs: string; fat: string };
type Portion = { label: string; grams: number };
type Food = {
  id: string;
  name: string;
  emoji: string;
  protein: number;
  carbs: number;
  fat: number;
  portions: Portion[];
  defaultPortion: number;
};
type Draft = {
  editId?: string;
  food: Food | null;
  custom: boolean;
  name: string;
  mealType: MealType;
  grams: number;
  values: MacroValues;
  source: 'manual' | 'photo' | 'edit';
  imagePreview?: string;
  candidates: Food[];
  confirmDelete: boolean;
};
type Reminder = {
  enabled: boolean;
  time: string;
  lead: number;
  days: boolean[];
  skipIfLogged: boolean;
};
type ReminderDraft = { meal: MealKey; value: Reminder };
type MealTotals = { calories: number; protein: number; carbs: number; fat: number };

const CALORIE_GOAL_FALLBACK = 2000;
const MACRO_SPLIT = { protein: 0.2, carbs: 0.5, fat: 0.3 };
const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const MEAL_TYPES: { key: MealType; label: string; shortLabel: string; emoji: string }[] = [
  { key: 'breakfast', label: 'Bữa sáng', shortLabel: 'Sáng', emoji: '🌅' },
  { key: 'lunch', label: 'Bữa trưa', shortLabel: 'Trưa', emoji: '☀️' },
  { key: 'snack', label: 'Bữa phụ', shortLabel: 'Phụ', emoji: '🍎' },
  { key: 'dinner', label: 'Bữa tối', shortLabel: 'Tối', emoji: '🌙' },
];
const MEAL_TYPE_ORDER = Object.fromEntries(MEAL_TYPES.map((meal, index) => [meal.key, index])) as Record<MealType, number>;
const MEAL_NAMES: Record<MealKey, string> = {
  breakfast: 'bữa sáng',
  lunch: 'bữa trưa',
  snack: 'bữa phụ',
  dinner: 'bữa tối',
};
const MEAL_SHARES: Record<MealKey, number> = {
  breakfast: 0.25,
  lunch: 0.35,
  snack: 0.1,
  dinner: 0.3,
};
const FOODS: Food[] = [
  { id: 'pho', name: 'Phở bò tái', emoji: '🍜', protein: 5, carbs: 11, fat: 2.2, portions: [{ label: 'Tô nhỏ', grams: 350 }, { label: 'Tô vừa', grams: 450 }, { label: 'Tô lớn', grams: 600 }], defaultPortion: 1 },
  { id: 'bunbo', name: 'Bún bò Huế', emoji: '🍲', protein: 5.5, carbs: 10, fat: 3, portions: [{ label: 'Tô nhỏ', grams: 400 }, { label: 'Tô vừa', grams: 500 }, { label: 'Tô lớn', grams: 650 }], defaultPortion: 1 },
  { id: 'comga', name: 'Cơm gà xối mỡ', emoji: '🍗', protein: 11, carbs: 20, fat: 6.5, portions: [{ label: 'Đĩa nhỏ', grams: 300 }, { label: 'Đĩa vừa', grams: 350 }, { label: 'Đĩa lớn', grams: 450 }], defaultPortion: 1 },
  { id: 'comtam', name: 'Cơm tấm sườn', emoji: '🍛', protein: 12, carbs: 22, fat: 8.5, portions: [{ label: 'Đĩa vừa', grams: 350 }, { label: 'Đĩa lớn', grams: 450 }], defaultPortion: 0 },
  { id: 'comtrang', name: 'Cơm trắng', emoji: '🍚', protein: 2.7, carbs: 28, fat: 0.3, portions: [{ label: '½ chén', grams: 80 }, { label: '1 chén', grams: 160 }, { label: '1 chén đầy', grams: 220 }], defaultPortion: 1 },
  { id: 'banhmi', name: 'Bánh mì thịt', emoji: '🥖', protein: 11, carbs: 34, fat: 9, portions: [{ label: 'Ổ nhỏ', grams: 130 }, { label: 'Ổ vừa', grams: 180 }, { label: 'Ổ lớn', grams: 230 }], defaultPortion: 1 },
  { id: 'goicuon', name: 'Gỏi cuốn tôm thịt', emoji: '🥬', protein: 6, carbs: 14, fat: 1.5, portions: [{ label: '1 cuốn', grams: 60 }, { label: '2 cuốn', grams: 120 }, { label: '3 cuốn', grams: 180 }], defaultPortion: 1 },
  { id: 'bunthit', name: 'Bún thịt nướng', emoji: '🍜', protein: 8, carbs: 18, fat: 5, portions: [{ label: 'Tô vừa', grams: 400 }, { label: 'Tô lớn', grams: 500 }], defaultPortion: 0 },
  { id: 'ga', name: 'Ức gà luộc', emoji: '🍖', protein: 31, carbs: 0, fat: 3.6, portions: [{ label: '½ ức', grams: 100 }, { label: '1 ức', grams: 150 }], defaultPortion: 1 },
  { id: 'trung', name: 'Trứng gà luộc', emoji: '🥚', protein: 13, carbs: 1, fat: 10.5, portions: [{ label: '1 quả', grams: 50 }, { label: '2 quả', grams: 100 }], defaultPortion: 0 },
  { id: 'rau', name: 'Rau muống xào tỏi', emoji: '🥗', protein: 2.5, carbs: 3, fat: 5, portions: [{ label: 'Đĩa nhỏ', grams: 120 }, { label: 'Đĩa vừa', grams: 180 }], defaultPortion: 1 },
  { id: 'canhchua', name: 'Canh chua cá', emoji: '🥣', protein: 4, carbs: 3, fat: 1.5, portions: [{ label: 'Bát nhỏ', grams: 250 }, { label: 'Tô vừa', grams: 350 }], defaultPortion: 0 },
  { id: 'suachua', name: 'Sữa chua có đường', emoji: '🥛', protein: 3.5, carbs: 14, fat: 2.5, portions: [{ label: '1 hũ', grams: 100 }, { label: '1 hũ lớn', grams: 130 }], defaultPortion: 1 },
  { id: 'chuoi', name: 'Chuối', emoji: '🍌', protein: 1.1, carbs: 23, fat: 0.3, portions: [{ label: '1 quả nhỏ', grams: 80 }, { label: '1 quả', grams: 110 }], defaultPortion: 1 },
  { id: 'cfsua', name: 'Cà phê sữa đá', emoji: '☕', protein: 1.2, carbs: 13, fat: 1.4, portions: [{ label: 'Ly nhỏ', grams: 150 }, { label: 'Ly vừa', grams: 250 }], defaultPortion: 1 },
  { id: 'trasua', name: 'Trà sữa trân châu', emoji: '🧋', protein: 1, carbs: 16, fat: 2, portions: [{ label: 'Ly vừa', grams: 500 }, { label: 'Ly lớn', grams: 700 }], defaultPortion: 0 },
];
const DEFAULT_REMINDERS: Record<MealKey, Reminder> = {
  breakfast: { enabled: true, time: '07:00', lead: 0, days: [true, true, true, true, true, true, true], skipIfLogged: true },
  lunch: { enabled: true, time: '12:00', lead: 0, days: [true, true, true, true, true, true, true], skipIfLogged: true },
  snack: { enabled: true, time: '15:30', lead: 0, days: [true, true, true, true, true, true, true], skipIfLogged: true },
  dinner: { enabled: true, time: '18:30', lead: 0, days: [true, true, true, true, true, true, true], skipIfLogged: true },
};
const EMPTY_TOTALS: MealTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 };

function round(value: number) {
  return Math.round(value);
}

function caloriesFromMacros(protein: number, carbs: number, fat: number) {
  return 4 * protein + 4 * carbs + 9 * fat;
}

function calculateFood(food: Food, grams: number): MealTotals {
  const portion = grams / 100;
  const protein = food.protein * portion;
  const carbs = food.carbs * portion;
  const fat = food.fat * portion;
  return { calories: round(caloriesFromMacros(protein, carbs, fat)), protein, carbs, fat };
}

function normalizeSearch(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
}

function mealForCurrentHour(): MealType {
  const hour = new Date().getHours();
  if (hour < 10) return 'breakfast';
  if (hour < 14) return 'lunch';
  if (hour < 17) return 'snack';
  return 'dinner';
}

function defaultReminderState(): Record<MealKey, Reminder> {
  return Object.fromEntries(
    Object.entries(DEFAULT_REMINDERS).map(([key, reminder]) => [key, { ...reminder, days: [...reminder.days] }]),
  ) as Record<MealKey, Reminder>;
}

function parseStoredReminders(value: string | null): Record<MealKey, Reminder> {
  if (!value) return defaultReminderState();
  try {
    const parsed = JSON.parse(value) as Partial<Record<MealKey, Partial<Reminder>>>;
    const defaults = defaultReminderState();
    return Object.fromEntries(
      (Object.keys(defaults) as MealKey[]).map(key => {
        const stored = parsed[key];
        return [key, {
          ...defaults[key],
          ...stored,
          days: Array.isArray(stored?.days) && stored.days.length === 7
            ? stored.days.map(Boolean)
            : defaults[key].days,
        }];
      }),
    ) as Record<MealKey, Reminder>;
  } catch {
    return defaultReminderState();
  }
}

function initialDraft(food: Food | null, source: Draft['source'] = 'manual'): Draft {
  return {
    food,
    custom: !food,
    name: food?.name ?? '',
    mealType: mealForCurrentHour(),
    grams: food ? food.portions[food.defaultPortion].grams : 0,
    values: { calories: '', protein: '', carbs: '', fat: '' },
    source,
    candidates: [],
    confirmDelete: false,
  };
}

function draftFromMeal(meal: Meal): Draft {
  const portionMatch = meal.food_name.match(/^(.*) · (\d+)g$/);
  const baseName = portionMatch?.[1] ?? meal.food_name;
  const food = FOODS.find(item => item.name === baseName) ?? null;
  if (food && portionMatch) {
    return {
      ...initialDraft(food),
      editId: meal.id,
      source: 'edit',
      mealType: meal.meal_type,
      grams: Number(portionMatch[2]),
    };
  }
  return {
    ...initialDraft(null),
    editId: meal.id,
    source: 'edit',
    custom: true,
    name: meal.food_name,
    mealType: meal.meal_type,
    values: {
      calories: String(meal.calories ?? ''),
      protein: String(meal.protein ?? ''),
      carbs: String(meal.carbs ?? ''),
      fat: String(meal.fat ?? ''),
    },
  };
}

function portionLabel(food: Food, grams: number) {
  const portion = food.portions.find(item => item.grams === grams);
  return portion ? `${portion.label} · ${grams}g` : `${grams}g`;
}

function repeatDescription(days: boolean[]) {
  const selected = days.map((enabled, index) => enabled ? index : -1).filter(index => index >= 0);
  if (selected.length === 7) return 'Hàng ngày';
  if (selected.join(',') === '0,1,2,3,4') return 'T2–T6';
  if (selected.join(',') === '5,6') return 'Cuối tuần';
  if (selected.length === 0) return 'Chưa chọn ngày';
  return selected.map(index => WEEKDAYS[index]).join(', ');
}

function shiftedTime(time: string, lead: number) {
  if (!time) return '--:--';
  const [hours, minutes] = time.split(':').map(Number);
  const total = (hours * 60 + minutes - lead + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export function NutritionScreen() {
  const { user, meals, profile, refreshMeals } = useApp();
  const [sheetView, setSheetView] = useState<SheetView | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [query, setQuery] = useState('');
  const [reminders, setReminders] = useState<Record<MealKey, Reminder>>(defaultReminderState);
  const [reminderDraft, setReminderDraft] = useState<ReminderDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const libraryInput = useRef<HTMLInputElement>(null);
  const photoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const calorieGoal = profile?.tdee && profile.tdee > 0 ? profile.tdee : CALORIE_GOAL_FALLBACK;
  const macroGoals = {
    protein: round(calorieGoal * MACRO_SPLIT.protein / 4),
    carbs: round(calorieGoal * MACRO_SPLIT.carbs / 4),
    fat: round(calorieGoal * MACRO_SPLIT.fat / 9),
  };
  const totals = useMemo(
    () => meals.reduce<MealTotals>((sum, meal) => ({
      calories: sum.calories + (meal.calories || 0),
      protein: sum.protein + (meal.protein || 0),
      carbs: sum.carbs + (meal.carbs || 0),
      fat: sum.fat + (meal.fat || 0),
    }), EMPTY_TOTALS),
    [meals],
  );
  const sortedMeals = useMemo(
    () => [...meals].sort((a, b) =>
      MEAL_TYPE_ORDER[a.meal_type] - MEAL_TYPE_ORDER[b.meal_type]
      || new Date(a.eaten_at).getTime() - new Date(b.eaten_at).getTime()),
    [meals],
  );
  const mealRecommendations = useMemo(() => {
    const gaps = {
      protein: Math.max(0, (macroGoals.protein - totals.protein) / macroGoals.protein),
      carbs: Math.max(0, (macroGoals.carbs - totals.carbs) / macroGoals.carbs),
      fat: Math.max(0, (macroGoals.fat - totals.fat) / macroGoals.fat),
    };
    const focus = (Object.entries(gaps) as [keyof typeof gaps, number][])
      .sort((a, b) => b[1] - a[1])[0];
    const macroLabels = { protein: 'chất đạm', carbs: 'tinh bột', fat: 'chất béo' };
    const focusText = focus[1] > 0.05
      ? `Ưu tiên bổ sung ${macroLabels[focus[0]]}`
      : 'Gợi ý món cân bằng trong thực đơn';
    const loggedFoods = new Set(meals.map(meal => {
      const name = meal.food_name.replace(/ · \d+g$/, '');
      return normalizeSearch(name);
    }));
    const unseenFoods = FOODS.filter(food => !loggedFoods.has(normalizeSearch(food.name)));
    const candidates = unseenFoods.length > 0 ? unseenFoods : FOODS;
    const remainingCalories = Math.max(0, calorieGoal - totals.calories);
    const weights = gaps.protein + gaps.carbs + gaps.fat > 0
      ? gaps
      : { protein: 0.2, carbs: 0.2, fat: 0.2 };

    const ranked = candidates.map(food => {
      const portion = food.portions[food.defaultPortion];
      const nutrition = calculateFood(food, portion.grams);
      const nutritionFit = (nutrition.protein / macroGoals.protein) * weights.protein
        + (nutrition.carbs / macroGoals.carbs) * weights.carbs
        + (nutrition.fat / macroGoals.fat) * weights.fat;
      const caloriePenalty = Math.max(0, nutrition.calories - remainingCalories) / calorieGoal;
      return { food, portion, nutrition, score: nutritionFit - caloriePenalty };
    }).sort((a, b) => b.score - a.score);

    return { focusText, items: ranked.slice(0, 3) };
  }, [calorieGoal, macroGoals.carbs, macroGoals.fat, macroGoals.protein, meals, totals]);
  const filteredFoods = useMemo(() => {
    const search = normalizeSearch(query.trim());
    return FOODS.filter(food => !search || normalizeSearch(food.name).includes(search));
  }, [query]);
  const progress = Math.min(1, totals.calories / calorieGoal);
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  const draftTotals = useMemo(() => {
    if (!draft) return EMPTY_TOTALS;
    if (!draft.custom && draft.food) return calculateFood(draft.food, draft.grams);
    const protein = Number(draft.values.protein) || 0;
    const carbs = Number(draft.values.carbs) || 0;
    const fat = Number(draft.values.fat) || 0;
    const calories = draft.values.calories.trim()
      ? Math.max(0, round(Number(draft.values.calories) || 0))
      : round(caloriesFromMacros(protein, carbs, fat));
    return { calories, protein, carbs, fat };
  }, [draft]);

  const advice = useMemo(() => {
    const ratio = totals.calories / calorieGoal;
    if (meals.length === 0) return 'Hôm nay bạn chưa ghi bữa nào. Bấm Thêm để ghi bữa đầu tiên.';
    if (ratio > 1) return 'Bạn đã vượt mục tiêu calo hôm nay. Bữa tiếp theo nên chọn món nhẹ hơn.';
    if (totals.protein / macroGoals.protein < ratio - 0.15) {
      return 'Bạn đang thiếu chất đạm so với lượng calo đã nạp. Thử thêm trứng, thịt gà hoặc đậu phụ.';
    }
    if (totals.fat / macroGoals.fat > ratio + 0.2) {
      return 'Lượng chất béo đang hơi cao so với calo đã nạp. Bữa sau nên chọn món ít dầu mỡ.';
    }
    return 'Tuyệt vời! Chế độ ăn của bạn khá cân bằng hôm nay.';
  }, [calorieGoal, macroGoals.fat, macroGoals.protein, meals.length, totals]);

  useEffect(() => {
    setReminders(parseStoredReminders(window.localStorage.getItem('goclock-nutrition-reminders')));
  }, []);

  useEffect(() => () => {
    if (photoTimer.current) clearTimeout(photoTimer.current);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
  }, [imagePreview]);

  useEffect(() => {
    if (!sheetView) return;
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape' || loading) return;
      if (photoTimer.current) clearTimeout(photoTimer.current);
      photoTimer.current = null;
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
      setSheetView(null);
      setDraft(null);
      setReminderDraft(null);
      setError('');
    }
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [imagePreview, loading, sheetView]);

  function clearPreview() {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
  }

  function openMenu() {
    setError('');
    setQuery('');
    setDraft(null);
    setReminderDraft(null);
    setSheetView('menu');
  }

  function closeSheet() {
    if (loading) return;
    if (photoTimer.current) clearTimeout(photoTimer.current);
    photoTimer.current = null;
    clearPreview();
    setSheetView(null);
    setDraft(null);
    setReminderDraft(null);
    setError('');
  }

  function openFood(food: Food) {
    setDraft(initialDraft(food));
    setSheetView('confirm');
    setError('');
  }

  function openCustom(name = '') {
    const next = initialDraft(null);
    next.name = name;
    setDraft(next);
    setSheetView('confirm');
    setError('');
  }

  function openMeal(meal: Meal) {
    setDraft(draftFromMeal(meal));
    setSheetView('confirm');
    setError('');
  }

  function updateDraft(patch: Partial<Draft>) {
    setDraft(current => current ? { ...current, ...patch } : current);
  }

  function updateCustomValue(key: keyof MacroValues, value: string) {
    setDraft(current => current
      ? { ...current, values: { ...current.values, [key]: value } }
      : current);
  }

  function handleBack() {
    if (sheetView === 'busy' || (sheetView === 'confirm' && draft?.source === 'photo')) {
      if (photoTimer.current) clearTimeout(photoTimer.current);
      photoTimer.current = null;
      clearPreview();
      setSheetView('menu');
      setDraft(null);
      setError('');
      return;
    }
    if (sheetView === 'confirm' && draft?.source === 'manual') {
      setSheetView('search');
      return;
    }
    setSheetView('menu');
    setDraft(null);
    setError('');
  }

  function handlePhotoSelected(file?: File) {
    if (!file) return;
    clearPreview();
    const preview = URL.createObjectURL(file);
    setImagePreview(preview);
    const candidates = [0, 3, 7].map(offset => FOODS[(file.size + offset) % FOODS.length]);
    setDraft(null);
    setSheetView('busy');
    setError('');
    photoTimer.current = setTimeout(() => {
      const food = candidates[0];
      setDraft({
        ...initialDraft(food, 'photo'),
        imagePreview: preview,
        candidates,
      });
      setSheetView(current => current === 'busy' ? 'confirm' : current);
      photoTimer.current = null;
    }, 1500);
  }

  function selectPhotoCandidate(food: Food) {
    setDraft(current => current ? {
      ...current,
      food,
      custom: false,
      name: food.name,
      grams: food.portions[food.defaultPortion].grams,
    } : current);
  }

  function editReminder(meal: MealKey) {
    setReminderDraft({
      meal,
      value: { ...reminders[meal], days: [...reminders[meal].days] },
    });
    setSheetView('remind');
    setError('');
  }

  function saveReminder() {
    if (!reminderDraft) return;
    const { meal, value } = reminderDraft;
    if (value.enabled && (!value.time || !value.days.some(Boolean))) {
      setError(!value.time ? 'Hãy chọn giờ ăn.' : 'Hãy chọn ít nhất một ngày để nhận thông báo.');
      return;
    }
    const next = { ...reminders, [meal]: value };
    try {
      window.localStorage.setItem('goclock-nutrition-reminders', JSON.stringify(next));
    } catch (storageError) {
      console.error('Unable to save nutrition reminders:', storageError);
      setError('Không thể lưu thiết lập lời nhắc trên thiết bị này.');
      return;
    }
    setReminders(next);
    setSheetView(null);
    setReminderDraft(null);
    setError('');
  }

  function updateReminder(patch: Partial<Reminder>) {
    setReminderDraft(current => current
      ? { ...current, value: { ...current.value, ...patch } }
      : current);
    setError('');
  }

  async function saveMeal() {
    if (!draft) return;
    const name = draft.custom ? draft.name.trim() : draft.food?.name.trim() ?? '';
    if (!name) {
      setError('Vui lòng nhập tên món ăn.');
      return;
    }
    if (draftTotals.calories <= 0) {
      setError('Calo phải lớn hơn 0. Hãy nhập calo hoặc các chất dinh dưỡng.');
      return;
    }
    if (!user) {
      setError('Bạn cần đăng nhập để lưu bữa ăn.');
      return;
    }

    const foodName = !draft.custom && draft.food
      ? `${draft.food.name} · ${draft.grams}g`
      : name;
    const existingMeal = draft.editId ? meals.find(meal => meal.id === draft.editId) : undefined;
    const payload = {
      food_name: foodName,
      calories: draftTotals.calories,
      protein: Number(draftTotals.protein.toFixed(2)),
      carbs: Number(draftTotals.carbs.toFixed(2)),
      fat: Number(draftTotals.fat.toFixed(2)),
      meal_type: draft.mealType,
      eaten_at: existingMeal?.eaten_at ?? new Date().toISOString(),
    };

    setLoading(true);
    setError('');
    try {
      if (draft.editId) {
        const { data, error: saveError } = await supabase
          .from('meals')
          .update(payload)
          .eq('id', draft.editId)
          .eq('user_id', user.id)
          .select('id')
          .maybeSingle();
        if (saveError) throw saveError;
        if (!data) throw new Error('Không tìm thấy bữa ăn cần cập nhật.');
      } else {
        const { error: saveError } = await supabase
          .from('meals')
          .insert({ ...payload, user_id: user.id });
        if (saveError) throw saveError;
      }
      await refreshMeals();
      clearPreview();
      setSheetView(null);
      setDraft(null);
    } catch (saveError) {
      console.error('Unable to save meal:', saveError);
      setError('Không thể lưu bữa ăn. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }

  async function deleteMeal() {
    if (!draft?.editId || !user) return;
    if (!draft.confirmDelete) {
      updateDraft({ confirmDelete: true });
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data, error: deleteError } = await supabase
        .from('meals')
        .delete()
        .eq('id', draft.editId)
        .eq('user_id', user.id)
        .select('id')
        .maybeSingle();
      if (deleteError) throw deleteError;
      if (!data) throw new Error('Không tìm thấy bữa ăn cần xóa.');
      await refreshMeals();
      closeSheet();
    } catch (deleteError) {
      console.error('Unable to delete meal:', deleteError);
      setError('Không thể xóa bữa ăn. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }

  const dateLabel = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <div className={styles.headingRow}>
          <div>
            <h1>Dinh dưỡng</h1>
            <p>{dateLabel}</p>
          </div>
          <button type="button" className={styles.addButton} onClick={openMenu}>
            <Plus size={17} /> Thêm
          </button>
        </div>

        <div className={styles.summary}>
          <div className={`${styles.ring} ${totals.calories > calorieGoal ? styles.ringOver : ''}`}>
            <svg viewBox="0 0 132 132" aria-hidden="true">
              <circle className={styles.ringTrack} cx="66" cy="66" r={radius} />
              <circle
                className={styles.ringProgress}
                cx="66"
                cy="66"
                r={radius}
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
              />
            </svg>
            <div className={styles.ringContent}>
              <strong>{round(totals.calories).toLocaleString('vi-VN')}</strong>
              <small>/ {round(calorieGoal).toLocaleString('vi-VN')} kcal</small>
              <span>
                {totals.calories <= calorieGoal
                  ? `Còn ${round(calorieGoal - totals.calories)} kcal`
                  : `Vượt ${round(totals.calories - calorieGoal)} kcal`}
              </span>
            </div>
          </div>

          <div className={styles.macros}>
            {([
              { key: 'protein', label: 'Chất đạm', color: '#ff7a6b', value: totals.protein, goal: macroGoals.protein },
              { key: 'carbs', label: 'Tinh bột', color: '#ffb347', value: totals.carbs, goal: macroGoals.carbs },
              { key: 'fat', label: 'Chất béo', color: '#5ab0ff', value: totals.fat, goal: macroGoals.fat },
            ] as const).map(item => (
              <div className={styles.macro} key={item.key}>
                <div className={styles.macroRow}>
                  <i style={{ backgroundColor: item.color }} />
                  <span>{item.label}</span>
                  <strong>{round(item.value)}g <small>/ {item.goal}g</small></strong>
                </div>
                <div className={styles.macroTrack}>
                  <i
                    style={{
                      width: `${Math.min(100, item.value / item.goal * 100)}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </header>

      <main className={styles.content}>
        <div className={styles.advice}>
          <Info size={17} />
          <span>{advice}</span>
        </div>

        <h2 className={styles.sectionTitle}>Bữa ăn hôm nay</h2>
        {sortedMeals.length === 0 ? (
          <div className={styles.empty}>
            <span>🥗</span>
            <strong>Chưa có bữa ăn nào.</strong>
            <p>Thêm món ăn để theo dõi lượng calo và dinh dưỡng hôm nay.</p>
            <button type="button" onClick={openMenu}>+ Ghi nhận bữa ăn</button>
          </div>
        ) : (
          sortedMeals.map(meal => {
            const item = MEAL_TYPES.find(type => type.key === meal.meal_type);
            const portion = meal.food_name.match(/ · (\d+g)$/)?.[1];
            const title = portion ? meal.food_name.replace(/ · \d+g$/, '') : meal.food_name;
            return (
              <button
                type="button"
                className={styles.mealCard}
                key={meal.id}
                onClick={() => openMeal(meal)}
                aria-label={`Sửa ${title}`}
              >
                <span className={styles.mealEmoji}>{item?.emoji ?? '🍽️'}</span>
                <span className={styles.mealDetails}>
                  <strong>{title}</strong>
                  <span className={styles.mealMeta}>
                    <i>{item?.label ?? 'Bữa ăn'}</i>
                    <span>{portion ?? new Date(meal.eaten_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                  </span>
                  <span className={styles.mealMacros}>
                    Đạm <b>{round(meal.protein)}g</b> · Tinh bột <b>{round(meal.carbs)}g</b> · Béo <b>{round(meal.fat)}g</b>
                  </span>
                </span>
                <strong className={styles.mealCalories}>{round(meal.calories)} <small>kcal</small></strong>
              </button>
            );
          })
        )}

        <section className={styles.schedule}>
          <h2 className={styles.sectionTitle}>Lịch ăn gợi ý hôm nay</h2>
          <p className={styles.scheduleHint}>Chạm vào từng bữa để chỉnh giờ và thiết lập lời nhắc.</p>
          {MEAL_TYPES.map(meal => {
            const key = meal.key;
            const reminder = reminders[key];
            return (
              <button
                type="button"
                className={styles.scheduleRow}
                key={meal.key}
                onClick={() => editReminder(key)}
                aria-label={`Chỉnh lời nhắc ${meal.label}`}
              >
                <strong>{meal.label}</strong>
                <span>{round(calorieGoal * MEAL_SHARES[key])} kcal gợi ý · {reminder.enabled ? repeatDescription(reminder.days) : 'Đã tắt'}</span>
                <em className={reminder.enabled ? '' : styles.reminderOff}>
                  <Bell size={15} />
                  {reminder.time.replace(/^0/, '')}
                  <ChevronRight size={15} />
                </em>
              </button>
            );
          })}
        </section>

        <section className={styles.recommendations}>
          <h2 className={styles.sectionTitle}>Món ăn gợi ý</h2>
          <p className={styles.scheduleHint}>
            {mealRecommendations.focusText}. Chọn món để xem khẩu phần và thêm vào nhật ký.
          </p>
          {mealRecommendations.items.map(({ food, portion, nutrition }) => (
            <button
              type="button"
              className={styles.recommendationRow}
              key={food.id}
              onClick={() => openFood(food)}
              aria-label={`Thêm gợi ý ${food.name}`}
            >
              <span className={styles.recommendationEmoji}>{food.emoji}</span>
              <span className={styles.recommendationDetails}>
                <strong>{food.name}</strong>
                <small>{portion.label} · {portion.grams}g</small>
                <small>
                  {nutrition.calories} kcal · Đạm {round(nutrition.protein)}g · Tinh bột {round(nutrition.carbs)}g · Béo {round(nutrition.fat)}g
                </small>
              </span>
              <span className={styles.recommendationAdd}><Plus size={17} /></span>
            </button>
          ))}
          <p className={styles.recommendationDisclaimer}>
            Ước tính tham khảo từ danh sách món ăn mẫu; nhu cầu thực tế có thể khác nhau.
          </p>
        </section>
      </main>

      {sheetView && (
        <div className={styles.overlay} onClick={closeSheet}>
          <section
            className={`${styles.sheet} ${sheetView === 'remind' ? styles.reminderSheet : ''}`}
            role="dialog"
            aria-modal="true"
            aria-label={sheetView === 'remind' ? 'Thiết lập lời nhắc' : sheetView === 'busy' ? 'Đang nhận diện món ăn' : 'Thêm bữa ăn'}
            onClick={event => event.stopPropagation()}
          >
            <div className={styles.grab} />
            <div className={styles.sheetHeader}>
              {sheetView !== 'menu' && (
                <button type="button" className={styles.roundButton} onClick={handleBack} aria-label="Quay lại">
                  <ArrowLeft size={18} />
                </button>
              )}
              <h2>
                {sheetView === 'menu' && 'Thêm bữa ăn'}
                {sheetView === 'search' && 'Tìm món ăn'}
                {sheetView === 'busy' && 'Đang nhận diện món ăn'}
                {sheetView === 'confirm' && (draft?.editId ? 'Sửa bữa ăn' : 'Xác nhận món ăn')}
                {sheetView === 'remind' && `Lời nhắc ${reminderDraft ? MEAL_NAMES[reminderDraft.meal] : ''}`}
              </h2>
              <button type="button" className={styles.roundButton} onClick={closeSheet} aria-label="Đóng">
                <X size={18} />
              </button>
            </div>

            {sheetView === 'menu' && (
              <div className={styles.sheetBody}>
                <p className={styles.lead}>Chọn cách ghi nhận bữa ăn:</p>
                <button type="button" className={`${styles.methodCard} ${styles.methodPhoto}`} onClick={() => cameraInput.current?.click()}>
                  <span><Camera size={25} /></span>
                  <i><strong>Chụp ảnh</strong><small>Mô phỏng nhận diện món và khẩu phần; hãy kiểm tra trước khi lưu.</small></i>
                  <ChevronRight size={18} />
                </button>
                <button type="button" className={`${styles.methodCard} ${styles.methodLibrary}`} onClick={() => libraryInput.current?.click()}>
                  <span><ImageIcon size={25} /></span>
                  <i><strong>Thư viện ảnh</strong><small>Chọn ảnh để xem gợi ý món ăn mô phỏng.</small></i>
                  <ChevronRight size={18} />
                </button>
                <button type="button" className={`${styles.methodCard} ${styles.methodManual}`} onClick={() => { setQuery(''); setSheetView('search'); }}>
                  <span><PenLine size={25} /></span>
                  <i><strong>Nhập tay</strong><small>Tìm món có sẵn hoặc tự nhập dinh dưỡng</small></i>
                  <ChevronRight size={18} />
                </button>
                <p className={styles.photoNote}>Luồng nhận diện hiện là mô phỏng theo mockup, chưa phân tích ảnh bằng AI thật.</p>
              </div>
            )}

            {sheetView === 'busy' && (
              <div className={styles.sheetBody}>
                <div className={styles.photoBusy}>
                  {imagePreview && <img src={imagePreview} alt="Ảnh món ăn đang được xử lý" />}
                  <span className={styles.spinner} aria-hidden="true" />
                  <strong>Đang nhận diện món ăn…</strong>
                  <small>Đây là bước mô phỏng giao diện; kết quả cần được kiểm tra lại.</small>
                </div>
              </div>
            )}

            {sheetView === 'search' && (
              <div className={styles.sheetBody}>
                <label className={styles.searchBox}>
                  <Search size={18} />
                  <input
                    autoFocus
                    value={query}
                    onChange={event => setQuery(event.target.value)}
                    placeholder="Tìm phở, cơm, rau..."
                  />
                </label>
                <div className={styles.foodList}>
                  {filteredFoods.map(food => {
                    const defaultPortion = food.portions[food.defaultPortion];
                    const nutrition = calculateFood(food, 100);
                    return (
                      <button type="button" className={styles.foodRow} key={food.id} onClick={() => openFood(food)}>
                        <span className={styles.foodEmoji}>{food.emoji}</span>
                        <span><strong>{food.name}</strong><small>{defaultPortion.label} · {defaultPortion.grams}g</small></span>
                        <em>{nutrition.calories} kcal/100g</em>
                      </button>
                    );
                  })}
                </div>
                {(filteredFoods.length === 0 || query.trim()) && (
                  <div className={styles.customPrompt}>
                    <span>{filteredFoods.length ? 'Không có đúng món bạn cần?' : `Không tìm thấy “${query.trim()}”.`}</span>
                    <p>Bạn có thể tự nhập calo và các chất dinh dưỡng.</p>
                    <button type="button" onClick={() => openCustom(query.trim())}>
                      Nhập thủ công{query.trim() ? ` “${query.trim()}”` : ''}
                    </button>
                  </div>
                )}
              </div>
            )}

            {sheetView === 'confirm' && draft && (
              <>
                <div className={styles.sheetBody}>
                  {draft.source === 'photo' && (
                    <>
                      <div className={styles.photoWarning}>
                        {draft.imagePreview && <img src={draft.imagePreview} alt="Ảnh món ăn đã chọn" />}
                        <span>
                          <strong>Gợi ý nhận diện mô phỏng</strong>
                          <small>Chọn món gần đúng nhất; kết quả chưa được phân tích bằng AI thật.</small>
                        </span>
                      </div>
                      <p className={styles.fieldLabel}>Không đúng món? Chọn gợi ý khác</p>
                      <div className={styles.chips}>
                        {draft.candidates.map(food => (
                          <button
                            type="button"
                            key={food.id}
                            aria-pressed={draft.food?.id === food.id}
                            onClick={() => selectPhotoCandidate(food)}
                          >
                            {food.name}
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {draft.custom ? (
                    <>
                      <label className={styles.fieldLabel} htmlFor="nutrition-name">Tên món</label>
                      <input
                        id="nutrition-name"
                        className={styles.textInput}
                        value={draft.name}
                        onChange={event => updateDraft({ name: event.target.value })}
                        placeholder="Ví dụ: Bánh flan nhà làm"
                      />
                      <p className={styles.fieldLabel}>Dinh dưỡng của cả khẩu phần</p>
                      <div className={styles.valueGrid}>
                        {([
                          ['calories', 'Calo (kcal)'],
                          ['protein', 'Chất đạm (g)'],
                          ['carbs', 'Tinh bột (g)'],
                          ['fat', 'Chất béo (g)'],
                        ] as [keyof MacroValues, string][]).map(([key, label]) => (
                          <label key={key}>
                            <span>{label}</span>
                            <input
                              className={styles.textInput}
                              type="number"
                              min="0"
                              step="any"
                              value={draft.values[key]}
                              onChange={event => updateCustomValue(key, event.target.value)}
                              placeholder={key === 'calories' ? 'Tự tính nếu bỏ trống' : '0'}
                            />
                          </label>
                        ))}
                      </div>
                    </>
                  ) : draft.food ? (
                    <>
                      <div className={styles.dishHeading}>
                        <span className={styles.foodEmoji}>{draft.food.emoji}</span>
                        <strong>{draft.food.name}</strong>
                      </div>
                      <p className={styles.fieldLabel}>Khẩu phần</p>
                      <div className={styles.chips}>
                        {draft.food.portions.map(portion => (
                          <button
                            type="button"
                            key={`${portion.label}-${portion.grams}`}
                            aria-pressed={portion.grams === draft.grams}
                            onClick={() => updateDraft({ grams: portion.grams })}
                          >
                            {portion.label} · {portion.grams}g
                          </button>
                        ))}
                      </div>
                      <div className={styles.gramControl}>
                        <button type="button" onClick={() => updateDraft({ grams: Math.max(1, draft.grams - 10) })} aria-label="Giảm 10 gam">
                          <Minus size={18} />
                        </button>
                        <label>
                          <input
                            type="number"
                            min="1"
                            max="2000"
                            value={draft.grams}
                            onChange={event => updateDraft({ grams: Math.max(1, Math.min(2000, Number(event.target.value) || 1)) })}
                            aria-label="Khối lượng tính bằng gam"
                          />
                          <span>g</span>
                        </label>
                        <button type="button" onClick={() => updateDraft({ grams: Math.min(2000, draft.grams + 10) })} aria-label="Tăng 10 gam">
                          <Plus size={18} />
                        </button>
                      </div>
                      <input
                        className={styles.range}
                        type="range"
                        min="10"
                        max="1000"
                        step="5"
                        value={Math.min(1000, draft.grams)}
                        onChange={event => updateDraft({ grams: Number(event.target.value) })}
                        aria-label="Kéo để chỉnh khối lượng"
                      />
                    </>
                  ) : null}

                  <div className={styles.resultCard}>
                    <strong>{draftTotals.calories} <small>kcal</small></strong>
                    <div>
                      <span>Chất đạm<b>{round(draftTotals.protein)}g</b></span>
                      <span>Tinh bột<b>{round(draftTotals.carbs)}g</b></span>
                      <span>Chất béo<b>{round(draftTotals.fat)}g</b></span>
                    </div>
                    <p>
                      {draft.custom
                        ? draft.values.calories.trim()
                          ? 'Bạn đang dùng số calo tự nhập.'
                          : 'Calo tự tính: chất đạm × 4 + tinh bột × 4 + chất béo × 9.'
                        : `Ước tính theo khẩu phần ${draft.grams}g. Số liệu món ăn chỉ mang tính tham khảo.`}
                    </p>
                  </div>

                  <p className={styles.fieldLabel}>Thuộc bữa nào?</p>
                  <div className={styles.mealSegments}>
                    {MEAL_TYPES.map(meal => (
                      <button
                        type="button"
                        key={meal.key}
                        aria-pressed={draft.mealType === meal.key}
                        onClick={() => updateDraft({ mealType: meal.key })}
                      >
                        {meal.shortLabel}
                      </button>
                    ))}
                  </div>
                  {error && <p className={styles.errorMessage} role="alert">{error}</p>}
                </div>
                <div className={styles.sheetFooter}>
                  {draft.editId && (
                    <button type="button" className={styles.deleteButton} disabled={loading} onClick={deleteMeal}>
                      <Trash2 size={16} /> {draft.confirmDelete ? 'Xác nhận xóa' : 'Xóa'}
                    </button>
                  )}
                  <button type="button" className={styles.saveButton} disabled={loading} onClick={saveMeal}>
                    {loading ? 'Đang lưu…' : draft.editId ? 'Lưu thay đổi' : 'Lưu vào hôm nay'}
                  </button>
                </div>
              </>
            )}

            {sheetView === 'remind' && reminderDraft && (
              <>
                <div className={styles.sheetBody}>
                  <div className={styles.reminderRow}>
                    <span><strong>Bật lời nhắc</strong><small>Nhắc bạn ghi nhận {MEAL_NAMES[reminderDraft.meal]}</small></span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={reminderDraft.value.enabled}
                      className={`${styles.switch} ${reminderDraft.value.enabled ? styles.switchOn : ''}`}
                      onClick={() => updateReminder({ enabled: !reminderDraft.value.enabled })}
                    />
                  </div>
                  <div className={!reminderDraft.value.enabled ? styles.disabledSettings : ''}>
                    <label className={styles.fieldLabel} htmlFor="reminder-time">Giờ ăn</label>
                    <input
                      id="reminder-time"
                      className={styles.textInput}
                      type="time"
                      value={reminderDraft.value.time}
                      onChange={event => updateReminder({ time: event.target.value })}
                      disabled={!reminderDraft.value.enabled}
                    />
                    <p className={styles.fieldLabel}>Nhắc trước</p>
                    <div className={styles.chips}>
                      {[[0, 'Đúng giờ'], [5, '5 phút'], [10, '10 phút'], [15, '15 phút'], [30, '30 phút']].map(([minutes, label]) => (
                        <button
                          type="button"
                          key={minutes}
                          aria-pressed={reminderDraft.value.lead === minutes}
                          disabled={!reminderDraft.value.enabled}
                          onClick={() => updateReminder({ lead: Number(minutes) })}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <p className={styles.fieldLabel}>Lặp lại</p>
                    <div className={styles.weekdays}>
                      {WEEKDAYS.map((day, index) => (
                        <button
                          type="button"
                          key={day}
                          aria-pressed={reminderDraft.value.days[index]}
                          disabled={!reminderDraft.value.enabled}
                          onClick={() => {
                            const days = [...reminderDraft.value.days];
                            days[index] = !days[index];
                            updateReminder({ days });
                          }}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                    <div className={styles.reminderRow}>
                      <span><strong>Bỏ qua nếu đã ghi bữa này</strong><small>Không nhắc nếu bạn đã ghi nhận bữa trước giờ nhắc</small></span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={reminderDraft.value.skipIfLogged}
                        className={`${styles.switch} ${reminderDraft.value.skipIfLogged ? styles.switchOn : ''}`}
                        onClick={() => updateReminder({ skipIfLogged: !reminderDraft.value.skipIfLogged })}
                      />
                    </div>
                    <div className={styles.reminderPreview}>
                      <Clock3 size={17} />
                      <span>
                        {reminderDraft.value.enabled
                          ? `Dự kiến nhắc lúc ${shiftedTime(reminderDraft.value.time, reminderDraft.value.lead)}. Lặp lại: ${repeatDescription(reminderDraft.value.days)}.`
                          : 'Lời nhắc đang tắt.'}
                        {' '}Đây chỉ là thiết lập trong ứng dụng; thông báo đẩy chưa được tích hợp.
                      </span>
                    </div>
                  </div>
                  {error && <p className={styles.errorMessage} role="alert">{error}</p>}
                </div>
                <div className={styles.sheetFooter}>
                  <button type="button" className={styles.saveButton} onClick={saveReminder}>Lưu thiết lập</button>
                </div>
              </>
            )}
          </section>
        </div>
      )}

      <input
        ref={cameraInput}
        className={styles.hiddenInput}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={event => {
          handlePhotoSelected(event.target.files?.[0]);
          event.currentTarget.value = '';
        }}
      />
      <input
        ref={libraryInput}
        className={styles.hiddenInput}
        type="file"
        accept="image/*"
        onChange={event => {
          handlePhotoSelected(event.target.files?.[0]);
          event.currentTarget.value = '';
        }}
      />
    </div>
  );
}
