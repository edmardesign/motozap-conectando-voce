import {
  Bike,
  Package,
  MapPin,
  Flag,
  Gift,
  Check,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  X,
  XCircle,
  Search,
  Bell,
  MessageCircle,
  Phone,
  Paperclip,
  Camera,
  Image as ImageIcon,
  FileText,
  Send,
  Plus,
  Wallet,
  DollarSign,
  Banknote,
  CreditCard,
  Cake,
  PartyPopper,
  Crown,
  Medal,
  Award,
  Trophy,
  Target,
  Sparkles,
  Zap,
  Lock,
  KeyRound,
  ShieldAlert,
  Building2,
  Store,
  Home as HomeIcon,
  Hospital,
  Church,
  School,
  Landmark,
  Cross,
  Bus,
  Pill,
  Pizza,
  User,
  Users,
  Smile,
  Frown,
  Hand,
  Clock,
  Calendar,
  MapPinned,
  Wind,
  Dice5,
  Handshake,
  LogOut,
  Wrench,
  Settings,
  BarChart3,
  Database,
  Fuel,
  Ban,
  Pencil,
  HelpCircle,
  RefreshCw,
  Star,
  Download,
  Smartphone,
  Lightbulb,
  Building,
  IdCard,
  Calculator,
  Route,
  Circle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  "🏍": Bike, "🏍️": Bike, "🛵": Bike, "🚗": Bike,
  "📦": Package,
  "📍": MapPin, "🏘": MapPinned, "🏘️": MapPinned, "🗺": MapPinned, "🗺️": MapPinned,
  "🏁": Flag,
  "🎁": Gift,
  "✅": CheckCircle2, "✓": Check,
  "⚠": AlertTriangle, "⚠️": AlertTriangle,
  "❌": XCircle, "✕": X,
  "🔍": Search,
  "🔔": Bell,
  "💬": MessageCircle,
  "📞": Phone, "📱": Smartphone,
  "📎": Paperclip,
  "📷": Camera, "📸": Camera,
  "📄": FileText, "📝": FileText,
  "➤": Send,
  "➕": Plus,
  "💵": Banknote, "💰": DollarSign, "💸": DollarSign,
  "💳": CreditCard,
  "🎂": Cake,
  "🎉": PartyPopper, "🎊": PartyPopper,
  "👑": Crown,
  "🥇": Medal, "🥈": Medal, "🥉": Medal,
  "🏆": Trophy,
  "🎯": Target,
  "✨": Sparkles,
  "⚡": Zap,
  "🔒": Lock, "🔐": Lock,
  "🔑": KeyRound,
  "🚨": ShieldAlert, "🚫": Ban, "⛔": Ban,
  "🏢": Building2, "🏪": Store, "🏦": Landmark, "🏥": Hospital,
  "⛪": Church, "🏫": School,
  "🚌": Bus,
  "💊": Pill,
  "🍕": Pizza, "🍔": Pizza,
  "👤": User, "🧑": User, "👋": Hand,
  "😊": Smile, "😔": Frown, "🙌": Hand, "🙏": Hand,
  "🕐": Clock,
  "📅": Calendar,
  "💨": Wind,
  "🎲": Dice5,
  "🤝": Handshake,
  "🚪": LogOut,
  "🔧": Wrench, "⚙": Settings, "⚙️": Settings,
  "📊": BarChart3,
  "🛢": Database, "🛢️": Database,
  "⛽": Fuel,
  "✏": Pencil, "✏️": Pencil,
  "❓": HelpCircle,
  "🔄": RefreshCw,
  "⭐": Star, "★": Star,
  "📲": Download,
  "💡": Lightbulb,
  "🏙": Building, "🏙️": Building,
  "🪪": IdCard,
  "🧮": Calculator,
  "🚦": Route,
  "🟢": Circle, "🔴": Circle, "🟡": Circle,
  "✍": Pencil, "✍️": Pencil,
};

interface Props {
  e: string;
  size?: number;
  className?: string;
  color?: string;
  strokeWidth?: number;
}

export function EmojiIcon({ e, size = 18, className, color = "#FFFFFF", strokeWidth = 2 }: Props) {
  const Icon = MAP[e];
  if (!Icon) {
    return <span className={className} aria-hidden>{e}</span>;
  }
  const fill = e === "🟢" ? "#22c55e" : e === "🔴" ? "#ef4444" : e === "🟡" ? "#eab308" : "none";
  return (
    <Icon
      size={size}
      color={color}
      strokeWidth={strokeWidth}
      className={className}
      style={fill !== "none" ? { fill, color: fill } : undefined}
      aria-hidden
    />
  );
}

export default EmojiIcon;
