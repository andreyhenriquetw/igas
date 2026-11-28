"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ChevronLeft, ChevronRight, CircleAlert, X } from "lucide-react";
import Image from "next/image";
import { changeKey, monthBounds } from "@/lib/calendar-dates";
import { uppercaseName } from "@/lib/name";
import {
  getOvernightDurationMinutes,
  getOvernightPrice,
  OVERNIGHT_CHECKOUT_TIME,
  OVERNIGHT_MAX_NIGHTS,
} from "@/lib/overnight";
import { isDateAvailableForMode } from "@/lib/public-availability";

type Mode = {
  id: string;
  code: string;
  name: string;
  defaultStart: string;
  durationMinutes: number;
  price: number | null;
};

const NO_OCCUPIED_PERIODS: Array<{ startsAt: string; endsAt: string }> = [];
const WHATSAPP_CONTACTS = [
  { name: "Denis", phone: "5593991606969", displayPhone: "(93) 99160-6969" },
  { name: "Junior", phone: "5593991293000", displayPhone: "(93) 99129-3000" },
];
const TESTIMONIALS = [
  {
    name: "Camila Oliveira",
    image: "/igas01.png",
    avatarScale: 1.5,
    avatarOffsetX: 0,
    avatarOffsetY: 20,
    visitType: "Pernoite",
    rating: 5,
    text: "Um ambiente agradável para descansar e curtir momentos especiais.",
  },
  {
    name: "Eduardo Martins",
    image: "/igas02.png",
    avatarScale: 2.2,
    avatarOffsetX: 0,
    avatarOffsetY: 15,
    visitType: "Lazer",
    rating: 5,
    text: "Um lugar para curtir a natureza e aproveitar bons momentos com a família, amei, super indico.",
  },
  {
    name: "Marcelo Ferreira",
    image: "/igas03.png",
    avatarScale: 2.2,
    avatarOffsetX: 0,
    avatarOffsetY: 12,
    visitType: "Lazer",
    rating: 5,
    text: "A estrutura do balneário convida a relaxar e aproveitar o dia, lugar maravilhoso.",
  },
  {
    name: "Juliana Costa",
    image: "/igas04.png",
    avatarScale: 1.5,
    avatarOffsetX: 0,
    avatarOffsetY: 15,
    visitType: "Família",
    rating: 5,
    text: "Um ambiente agradável para descansar e curtir momentos especiais.",
  },
  {
    name: "Ricardo Almeida",
    image: "/igas05.png",
    avatarScale: 1.4,
    avatarOffsetX: 0,
    avatarOffsetY: 18,
    visitType: "Pernoite",
    rating: 5,
    text: "Natureza e lazer em um só lugar para aproveitar com quem a gente gosta, parabens aos Donos.",
  },
];
const GALLERY_ITEMS = [
  { type: "video", src: "/igasvi.mp4", poster: "/igasimg3.jpg", label: "Igarapé", className: "gallery-one" },
  { type: "video", src: "/igasvi2.mp4", poster: "/igasimg2.jpg", label: "Lazer no Ígas", className: "gallery-two" },
  { type: "video", src: "/igasvi3.mp4", poster: "/igasimg1.jpg", label: "Ambiente do balneário", className: "gallery-three" },
  { type: "image", src: "/igasimg1.jpg", label: "Quarto", className: "gallery-four" },
  { type: "image", src: "/igasimg2.jpg", label: "Mesa de sinuca", className: "gallery-five" },
  { type: "image", src: "/igasimg3.jpg", label: "TV", className: "gallery-six" },
  { type: "image", src: "/igasimg4.jpg", label: "Banheiro", className: "gallery-seven" },
] as const;

function WhatsAppIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.198-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.297-.496.099-.198.05-.372-.025-.521-.075-.149-.669-1.612-.916-2.213-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.875 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.693.626.711.226 1.358.194 1.87.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.29.173-1.414-.074-.123-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.999-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.002-5.45 4.438-9.886 9.893-9.886 2.64.001 5.12 1.03 6.99 2.902a9.825 9.825 0 0 1 2.895 6.994c-.003 5.45-4.44 9.886-9.895 9.886m8.413-18.3A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c-.001 2.096.547 4.142 1.588 5.946L.057 24l6.304-1.654a11.882 11.882 0 0 0 5.684 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.82 11.82 0 0 0-3.48-8.398Z" />
    </svg>
  );
}

function formatCpf(value: string) {
  return value
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function endTimeForMode(mode: Mode) {
  const [hour, minute] = mode.defaultStart.split(":").map(Number);
  const endMinutes = hour * 60 + minute + mode.durationMinutes;
  return `${String(Math.floor(endMinutes / 60) % 24).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;
}

function formatDateKey(value: string) {
  return `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}`;
}

function formatShortDateKey(value: string) {
  return `${value.slice(8, 10)}/${value.slice(5, 7)}`;
}

function addDays(value: string, days: number) {
  const date = new Date(`${value}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function scheduleLabel(mode: Mode, date: string, durationNights = 1, shortDate = false) {
  const formatDate = shortDate ? formatShortDateKey : formatDateKey;
  if (mode.code === "OVERNIGHT") {
    const [hour, minute] = mode.defaultStart.split(":").map(Number);
    const endMinutes = hour * 60 + minute + getOvernightDurationMinutes(durationNights, mode.defaultStart);
    const endTimeForStay = `${String(Math.floor(endMinutes / 60) % 24).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;
    if (!date) return `Entrada às ${mode.defaultStart} · saída às ${endTimeForStay} após ${durationNights} ${durationNights === 1 ? "noite" : "noites"}`;
    return `${mode.defaultStart} de ${formatDate(date)} – ${endTimeForStay} de ${formatDate(addDays(date, durationNights))}`;
  }
  const endTime = endTimeForMode(mode);
  if (mode.durationMinutes < 1440) return `${mode.defaultStart} – ${endTime}`;
  if (!date) return `${mode.defaultStart} – ${endTime} do dia seguinte`;
  return `${mode.defaultStart} de ${formatDate(date)} – ${endTime} de ${formatDate(addDays(date, 1))}`;
}

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function modePrice(mode: Mode, durationDays = 1) {
  if (mode.code === "OVERNIGHT") {
    return money.format(getOvernightPrice(durationDays));
  }
  return mode.price !== null
    ? money.format(mode.price)
    : mode.durationMinutes >= 1440 ? "R$ 1.500" : "R$ 800";
}

function modeOptionLabel(mode: Mode) {
  return mode.code === "OVERNIGHT"
    ? mode.name
    : `${mode.name} — ${modePrice(mode)}`;
}

export function PublicBooking() {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" })
    .format(new Date())
    .replaceAll("/", "-");
  const heroBackgroundRef = useRef<HTMLDivElement>(null);
  const heroVideoRef = useRef<HTMLVideoElement>(null);
  const [modes, setModes] = useState<Mode[]>([]);
  const [modeId, setModeId] = useState("");
  const [date, setDate] = useState("");
  const [durationDays, setDurationDays] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(`${today.slice(0, 7)}-01`);
  const [menuOpen, setMenuOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [activeGalleryIndex, setActiveGalleryIndex] = useState<number | null>(null);
  const isGalleryOpen = activeGalleryIndex !== null;
  const galleryCloseButtonRef = useRef<HTMLButtonElement>(null);
  const [whatsappMessage, setWhatsappMessage] = useState("");
  const [availability, setAvailability] = useState<{
    period: string;
    occupied: Array<{ startsAt: string; endsAt: string }>;
    error: string;
  }>({ period: "", occupied: [], error: "" });
  const [guestName, setGuestName] = useState("");
  const [guestContact, setGuestContact] = useState("");
  const [guestCpf, setGuestCpf] = useState("");
  const [guestAddress, setGuestAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [rating, setRating] = useState(0);
  const [reviewName, setReviewName] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [reviewType, setReviewType] = useState("Lazer");

  useEffect(() => {
    document.documentElement.dataset.theme = "dark";
  }, []);

  useEffect(() => {
    if (!isGalleryOpen) return;

    const previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    document.body.style.overflow = "hidden";
    galleryCloseButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = "";
      previousFocus?.focus();
    };
  }, [isGalleryOpen]);

  useEffect(() => {
    if (activeGalleryIndex === null) return;

    const handleGalleryKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveGalleryIndex(null);
      if (event.key === "ArrowLeft") {
        setActiveGalleryIndex((index) => index === null ? null : (index - 1 + GALLERY_ITEMS.length) % GALLERY_ITEMS.length);
      }
      if (event.key === "ArrowRight") {
        setActiveGalleryIndex((index) => index === null ? null : (index + 1) % GALLERY_ITEMS.length);
      }
    };

    window.addEventListener("keydown", handleGalleryKeyDown);
    return () => window.removeEventListener("keydown", handleGalleryKeyDown);
  }, [activeGalleryIndex]);

  useEffect(() => {
    const video = heroVideoRef.current;
    if (!video) return;

    const mobileViewport = window.matchMedia("(max-width: 768px)");
    let observer: IntersectionObserver | null = null;
    let isVisible = false;

    const syncPlayback = (isVisible: boolean) => {
      if (mobileViewport.matches && isVisible) {
        void video.play().catch(() => {});
      } else {
        video.pause();
      }
    };

    observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
        syncPlayback(isVisible);
      },
      { threshold: 0 },
    );
    observer.observe(video);

    const syncViewport = () => syncPlayback(isVisible);
    mobileViewport.addEventListener("change", syncViewport);

    return () => {
      observer?.disconnect();
      mobileViewport.removeEventListener("change", syncViewport);
      video.pause();
    };
  }, []);

  useEffect(() => {
    const videos = document.querySelectorAll<HTMLVideoElement>(".client-gallery-preview");
    if (isGalleryOpen) {
      videos.forEach((video) => video.pause());
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!(entry.target instanceof HTMLVideoElement)) return;
          const video = entry.target;

          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            void video.play().catch((error: unknown) => {
              if (error instanceof DOMException && ["AbortError", "NotAllowedError"].includes(error.name)) return;
              console.error("Could not autoplay gallery video.", error);
            });
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.5 },
    );

    videos.forEach((video) => observer.observe(video));
    return () => {
      observer.disconnect();
      videos.forEach((video) => video.pause());
    };
  }, [isGalleryOpen]);

  useEffect(() => {
    const heroBackground = heroBackgroundRef.current;
    if (!heroBackground) return;

    let frame = 0;
    const updatePosition = () => {
      frame = 0;
      heroBackground.style.transform = `scale(1.06) translateY(${window.scrollY * 0.2}px)`;
    };
    const onScroll = () => {
      if (frame === 0) frame = window.requestAnimationFrame(updatePosition);
    };

    updatePosition();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame !== 0) window.cancelAnimationFrame(frame);
    };
  }, []);

  const calendarBounds = monthBounds(calendarMonth);
  const calendarEnd = changeKey(calendarBounds.gridStart, calendarBounds.gridDays);
  const availabilityPeriod = `${calendarBounds.gridStart}:${calendarEnd}`;

  useEffect(() => {
    let active = true;
    const query = new URLSearchParams({ from: calendarBounds.gridStart, to: calendarEnd });
    void fetch(`/api/public/bookings?${query}`, { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Não foi possível consultar a disponibilidade.");
        if (active) {
          setModes(result.modes);
          setModeId((current) => result.modes.some((mode: Mode) => mode.id === current)
            ? current
            : result.modes[0]?.id ?? "");
          setAvailability({
            period: availabilityPeriod,
            occupied: result.occupied ?? [],
            error: "",
          });
        }
      })
      .catch((availabilityError) => {
        if (active) {
          setAvailability({
            period: availabilityPeriod,
            occupied: [],
            error: availabilityError instanceof Error
              ? availabilityError.message
              : "Não foi possível consultar a disponibilidade.",
          });
        }
      });
    return () => {
      active = false;
    };
  }, [availabilityPeriod, calendarBounds.gridStart, calendarEnd]);

  const calendarDays = Array.from({ length: calendarBounds.gridDays }, (_, index) => changeKey(calendarBounds.gridStart, index));
  const occupied = availability.period === availabilityPeriod ? availability.occupied : NO_OCCUPIED_PERIODS;
  const availabilityLoading = availability.period !== availabilityPeriod;
  const availabilityError = availability.period === availabilityPeriod ? availability.error : "";
  const calendarMonthLabel = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${calendarMonth}T12:00:00.000Z`));

  const selectedMode = useMemo(() => modes.find((mode) => mode.id === modeId), [modes, modeId]);
  const exampleStartDate = date || today;
  const exampleNights = durationDays ? Number(durationDays) : 3;
  const overnightTotal = durationDays ? getOvernightPrice(Number(durationDays)) : null;
  const overnightDeposit = overnightTotal === null ? null : money.format(overnightTotal / 2);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedMode || !date) {
      setError("Selecione uma modalidade e uma data.");
      return;
    }
    if (!guestAddress.trim()) {
      setError("Informe seu endereço.");
      return;
    }
    if (conflict) {
      setError(selectedMode.code === "OVERNIGHT"
        ? `Não há disponibilidade para ${durationDays} ${Number(durationDays) === 1 ? "noite" : "noites"} a partir de ${formatDateKey(date)}. Escolha outra data ou reduza a quantidade de noites.`
        : "Esta data não está disponível para a modalidade escolhida. Escolha outra data.");
      return;
    }
    if (availabilityLoading) {
      setError("Aguarde a confirmação da disponibilidade antes de continuar.");
      return;
    }
    if (availabilityError) {
      setError(availabilityError);
      return;
    }
    if (selectedMode.code === "OVERNIGHT" && Number(durationDays) < 1) {
      setError("Selecione pelo menos 1 noite para o pernoite.");
      return;
    }
    const overnightDays = durationDays ? Number(durationDays) : 1;

    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/public/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestName,
          guestContact,
          guestCpf,
          guestAddress,
          modeId,
          date,
          durationDays: selectedMode.code === "OVERNIGHT" ? overnightDays : undefined,
          notes,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Não foi possível solicitar o agendamento.");
      const message = [
        "Olá, ÍGAS! 👋",
        "",
        "Quero finalizar minha solicitação de reserva pelo site:",
        "",
        `👤 Nome: ${guestName.trim()}`,
        `📞 Telefone ou WhatsApp: ${guestContact.trim()}`,
        `🪪 CPF: ${guestCpf.trim()}`,
        `🏡 Modalidade: ${selectedMode.name}`,
        `💰 Valor: ${modePrice(selectedMode, overnightDays)}`,
        ...(selectedMode.code === "OVERNIGHT"
          ? [
            `📅 Check-in: ${formatDateKey(date)} às ${selectedMode.defaultStart}`,
            `🌙 Noites reservadas (${overnightDays}): ${Array.from({ length: overnightDays }, (_, index) => formatDateKey(addDays(date, index))).join(", ")}`,
            `🕒 Check-out: ${formatDateKey(addDays(date, overnightDays))} até ${OVERNIGHT_CHECKOUT_TIME}`,
          ]
          : [
            `📅 Data: ${formatDateKey(date)}`,
            `🕒 Horário: ${scheduleLabel(selectedMode, date, overnightDays)}`,
          ]),
        `📍 Endereço: ${guestAddress.trim()}`,
        ...(notes.trim() ? [`📝 Observações: ${notes.trim()}`] : []),
        "",
        "Aguardo a confirmação. Obrigado(a)! 😊",
      ].join("\n");
      setWhatsappMessage(message);
      setSuccess(result.message);
      setBookingOpen(false);
      setSuccessOpen(true);
      setGuestName("");
      setGuestContact("");
      setGuestCpf("");
      setGuestAddress("");
      setNotes("");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Não foi possível solicitar o agendamento.");
    } finally {
      setLoading(false);
    }
  }

  function toggleTheme() {
    const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
  }

  function openBooking() {
    setError("");
    setSuccess("");
    if (!date || !selectedMode || availabilityLoading || availabilityError || !isDateAvailableForMode(date, selectedMode, occupied)) {
      document.getElementById("reserva")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    setBookingOpen(true);
  }

  function navigateCalendar(months: number) {
    const [year, month] = calendarMonth.slice(0, 7).split("-").map(Number);
    const nextMonth = new Date(Date.UTC(year, month - 1 + months, 1, 12));
    setCalendarMonth(nextMonth.toISOString().slice(0, 10));
    setDate("");
  }

  function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (reviewName.trim().length < 2 || reviewText.trim().length < 10 || rating === 0) {
      setError("Informe seu nome, escreva um comentário de pelo menos 10 caracteres e selecione uma avaliação.");
      return;
    }
    const reviews = JSON.parse(localStorage.getItem("igas-reviews") || "[]");
    reviews.push({
      name: reviewName.trim(),
      rating,
      comment: reviewText.trim(),
      stayType: reviewType,
      date: today,
    });
    localStorage.setItem("igas-reviews", JSON.stringify(reviews));
    setReviewName("");
    setReviewText("");
    setReviewType("Lazer");
    setRating(0);
    setSuccess("Avaliação enviada. Obrigado por compartilhar sua experiência!");
    setSuccessOpen(true);
  }

  function shareIgasOnWhatsApp() {
    const pageUrl = "https://igas-puce.vercel.app/cliente";
    const message = `Conheça o Balneário Ígas! Confira os dias disponíveis e os preços e planeje sua visita: ${pageUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  }

  function returnToClientHome() {
    setSuccessOpen(false);
    setBookingOpen(false);
    setModeId(modes[0]?.id ?? "");
    setDate("");
    setDurationDays("");
    setGuestName("");
    setGuestContact("");
    setGuestCpf("");
    setGuestAddress("");
    setNotes("");
    setError("");
    setSuccess("");
    setWhatsappMessage("");
    setLoading(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const conflict = Boolean(
    date
    && selectedMode
    && (!durationDays && selectedMode.code === "OVERNIGHT"
      ? false
      : !isDateAvailableForMode(
        date,
        selectedMode,
        occupied,
        selectedMode.code === "OVERNIGHT" ? Number(durationDays) : 1,
      )),
  );

  useEffect(() => {
    if (!bookingOpen || !conflict) return;

    const timer = window.setTimeout(() => {
      setBookingOpen(false);
      setError("");
      setDate("");
      document.getElementById("reserva")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 10000);

    return () => window.clearTimeout(timer);
  }, [bookingOpen, conflict]);

  return (
    <main className="client-site">
      <nav className="client-nav">
        <div className="client-nav-inner">
          <a className="client-brand" href="#inicio" aria-label="Balneário Ígas">
            <img className="client-logo-dark" src="/igas-logo-transparent.png" alt="" />
            <img className="client-logo-light" src="/igaspreto.png" alt="" />
          </a>
          <div className="client-nav-links">
            <a href="#inicio">Início</a>
            <a href="#galeria">Galeria</a>
            <a href="#modalidades">Modalidades</a>
            <a href="#avaliacoes">Avaliações</a>
          </div>
          <div className="client-nav-actions">
            <button className="client-theme" type="button" onClick={toggleTheme} aria-label="Alternar tema">
              <span className="client-theme-sun" aria-hidden="true">☀️</span>
              <span className="client-theme-moon" aria-hidden="true">🌙</span>
            </button>
            <button className="client-menu" type="button" onClick={() => setMenuOpen(true)} aria-label="Abrir menu">
              <span /><span /><span />
            </button>
          </div>
        </div>
      </nav>

      {menuOpen && (
        <div className="client-mobile-menu">
          <button type="button" onClick={() => setMenuOpen(false)} aria-label="Fechar menu">✕</button>
          <a href="#inicio" onClick={() => setMenuOpen(false)}>Início</a>
          <a href="#galeria" onClick={() => setMenuOpen(false)}>Galeria</a>
          <a href="#modalidades" onClick={() => setMenuOpen(false)}>Modalidades</a>
          <a href="#avaliacoes" onClick={() => setMenuOpen(false)}>Avaliações</a>
        </div>
      )}

      <section className="client-hero" id="inicio">
        <div className="client-hero-bg" ref={heroBackgroundRef} />
        <video
          ref={heroVideoRef}
          className="client-hero-mobile-video"
          src="https://xd90tgazad.ufs.sh/f/r9YwIz1ulNCW754khGcXUqNfa4tPhKW12jnRZwBTS8mQIFGO"
          muted
          autoPlay
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
        />
        <div className="client-hero-content">
          <span className="client-hero-eyebrow">Seu lazer, nossa prioridade</span>
          <h1>Momentos de lazer<br />com o <em>melhor conforto</em></h1>
          <p>Descubra o Balneário Ígas e viva experiências inesquecíveis em um ambiente acolhedor e preparado para toda a família.</p>
          <div className="client-hero-actions">
            <button type="button" onClick={openBooking}>Reservar agora</button>
            <a href="#galeria">Conhecer o balneário</a>
          </div>
        </div>
        <div className="client-hero-stats">
          <div><strong>2</strong><span>Modalidades</span></div>
          <div><strong>100%</strong><span>De lazer</span></div>
          <div><strong>Todos</strong><span>Os públicos</span></div>
          <div><strong>Ígas</strong><span>Balneário</span></div>
        </div>
      </section>

      <section className="client-booking-bar" aria-label="Agendamento rápido">
        <div className="client-booking-content" id="reserva">
          <h2>Reserve seu momento</h2>
          <div className="client-calendar-layout">
            <div className="client-calendar-panel">
              <div className="client-calendar-header">
                <button type="button" onClick={() => navigateCalendar(-1)} aria-label="Mês anterior">‹</button>
                <h3>{calendarMonthLabel}</h3>
                <button type="button" onClick={() => navigateCalendar(1)} aria-label="Próximo mês">›</button>
              </div>
              <div className="client-calendar-weekdays" aria-hidden="true">
                {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((weekday) => <span key={weekday}>{weekday}</span>)}
              </div>
              <div className="client-calendar-days">
                {calendarDays.map((day) => {
                  const inMonth = day.slice(0, 7) === calendarMonth.slice(0, 7);
                  const past = day < today;
                  const selectedStayDays = selectedMode?.code === "OVERNIGHT" && durationDays
                    ? Number(durationDays)
                    : 1;
                  const isSelectedCheckoutDay = Boolean(
                    date
                    && selectedMode?.code === "OVERNIGHT"
                    && durationDays
                    && day === addDays(date, selectedStayDays),
                  );
                  const isSelectedStayDay = Boolean(
                    date
                    && day >= date
                    && day <= addDays(
                      date,
                      selectedMode?.code === "OVERNIGHT" && durationDays
                        ? selectedStayDays
                        : selectedStayDays - 1,
                    ),
                  );
                  const available = Boolean(selectedMode
                    && !availabilityLoading
                    && !availabilityError
                    && isDateAvailableForMode(day, selectedMode, occupied, 1));
                  const availableForStart = available && !isSelectedCheckoutDay;
                  const dayClasses = [
                    "client-calendar-day",
                    !inMonth && "outside-month",
                    day === today && "today",
                    day === date && "selected",
                    isSelectedStayDay && day !== date && "selected-stay",
                    isSelectedCheckoutDay && "unavailable",
                    isSelectedCheckoutDay && "checkout-unavailable",
                    past && "past",
                    inMonth && !past && !availabilityLoading && !availabilityError
                      ? availableForStart ? "available" : "unavailable"
                      : "",
                  ].filter(Boolean).join(" ");
                  const status = isSelectedCheckoutDay
                    ? `Data de check-out até ${OVERNIGHT_CHECKOUT_TIME}; indisponível para novo agendamento`
                    : past ? "Data passada" : availabilityLoading
                    ? "Consultando disponibilidade"
                    : availabilityError ? "Disponibilidade indisponível"
                      : availableForStart ? "Disponível" : "Indisponível";
                  const selectedStayOrdinal = date
                    ? Math.floor(
                      (new Date(`${day}T12:00:00.000Z`).getTime() - new Date(`${date}T12:00:00.000Z`).getTime()) / 86_400_000,
                    ) + 1
                    : 0;
                  const dayLabel = isSelectedCheckoutDay
                    ? status
                    : isSelectedStayDay && day !== date
                    ? `${selectedMode?.code === "OVERNIGHT" ? `Noite ${selectedStayOrdinal} incluída` : `Dia ${selectedStayOrdinal} do período selecionado`}; ${status.toLocaleLowerCase("pt-BR")} como data de início`
                    : status;
                  return (
                    <button
                      className={dayClasses}
                      type="button"
                      key={day}
                      disabled={!inMonth || past || availabilityLoading || Boolean(availabilityError) || !availableForStart}
                      aria-label={`${day.slice(-2)}: ${dayLabel}`}
                      aria-pressed={day === date}
                      onClick={() => setDate(day)}
                      style={day === date ? {
                        background: "#c4963a",
                        borderColor: "#e8be72",
                        color: "#fff",
                      } : undefined}
                    >
                      {Number(day.slice(-2))}
                    </button>
                  );
                })}
              </div>
              <div className="client-calendar-legend">
                <span><i className="legend-available" />Disponível</span>
                <span><i className="legend-unavailable" />Indisponível</span>
                <span><i className="legend-selected" />Período selecionado</span>
              </div>
              {availabilityLoading && <p className="client-calendar-message" role="status">Consultando datas...</p>}
              {availabilityError && <p className="client-calendar-error" role="alert">{availabilityError}</p>}
              {conflict && date && selectedMode && (
                <p className="client-calendar-error" role="alert">
                  {selectedMode.code === "OVERNIGHT"
                    ? `Não há disponibilidade para ${durationDays} ${Number(durationDays) === 1 ? "noite" : "noites"} a partir de ${formatDateKey(date)}. Escolha outra data ou reduza a quantidade de noites.`
                    : "Esta data não está disponível para a modalidade escolhida. Escolha outra data."}
                </p>
              )}
            </div>
            <div className="client-booking-options">
              <label>Modalidade
                <select value={modeId} onChange={(event) => {
                  setModeId(event.target.value);
                  setDurationDays("");
                  setError("");
                }}>
                  {modes.map((mode) => <option value={mode.id} key={mode.id}>{modeOptionLabel(mode)}</option>)}
                </select>
              </label>
              {selectedMode?.code === "OVERNIGHT" && (
                <>
                  <label>Quantas noites deseja ficar
                    <select value={durationDays} onChange={(event) => setDurationDays(event.target.value)} required>
                      <option value="">Selecione a quantidade de noites</option>
                      {Array.from({ length: OVERNIGHT_MAX_NIGHTS }, (_, index) => index + 1).map((days) => (
                        <option key={days} value={days}>
                          {days} {days === 1 ? "noite" : "noites"} — {money.format(getOvernightPrice(days))}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="client-overnight-example" role="note">
                    <strong>Exemplo de pernoite</strong>
                    <span>
                      Cada noite corresponde a uma data dormida. Exemplo: {exampleNights} {exampleNights === 1 ? "noite" : "noites"} a partir de {formatShortDateKey(exampleStartDate)} incluem as noites de {Array.from({ length: exampleNights }, (_, index) => formatShortDateKey(addDays(exampleStartDate, index))).join(", ")}, com saída em {formatShortDateKey(addDays(exampleStartDate, exampleNights))} até {OVERNIGHT_CHECKOUT_TIME}.
                    </span>
                  </div>
                </>
              )}
              <div className="client-date-selection">
                <span>Valor da modalidade</span>
                <strong>
                  {selectedMode?.code === "OVERNIGHT" && !durationDays
                    ? "Selecione quantas noites deseja ficar"
                    : selectedMode
                      ? modePrice(selectedMode, selectedMode.code === "OVERNIGHT" ? Number(durationDays) : 1)
                      : "Selecione uma modalidade"}
                </strong>
              </div>
              <label>Horário previsto
                <input
                  value={selectedMode?.code === "OVERNIGHT" && !durationDays
                    ? "Selecione quantas noites deseja ficar"
                    : selectedMode
                      ? scheduleLabel(selectedMode, date, selectedMode.code === "OVERNIGHT" ? Number(durationDays) : 1, true)
                      : "Carregando..."}
                  readOnly
                />
              </label>
              <div className="client-date-selection">
                <span>Data escolhida</span>
                <strong>{date ? formatDateKey(date) : "Selecione uma data disponível"}</strong>
              </div>
              <button
                type="button"
                onClick={openBooking}
                disabled={!date || modes.length === 0 || conflict || availabilityLoading || Boolean(availabilityError) || (selectedMode?.code === "OVERNIGHT" && !durationDays)}
              >
                Solicitar reserva
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="client-section client-gallery" id="galeria">
        <div className="client-section-heading">
          <span>Passeio visual</span>
          <h2>Um olhar pelo <em>Ígas</em></h2>
          <i />
        </div>
        <div className="client-gallery-grid">
          {GALLERY_ITEMS.map((item, index) => (
            <figure className={item.className} key={item.src + item.className}>
              <button
                className="client-gallery-item"
                type="button"
                onClick={() => setActiveGalleryIndex(index)}
                aria-label={`Abrir ${item.type === "video" ? "vídeo" : "imagem"}: ${item.label}`}
              >
                {item.type === "video" ? (
                  <video className="client-gallery-preview" src={item.src} poster={item.poster} muted loop playsInline preload="none" />
                ) : (
                  <Image
                    src={item.src}
                    alt={item.label}
                    fill
                    sizes="(max-width: 540px) calc(100vw - 32px), (max-width: 768px) 50vw, 475px"
                    loading="lazy"
                  />
                )}
                <figcaption>{item.label}</figcaption>
              </button>
            </figure>
          ))}
        </div>
      </section>

      {activeGalleryIndex !== null && (() => {
        const item = GALLERY_ITEMS[activeGalleryIndex];
        const showPrevious = () => setActiveGalleryIndex((activeGalleryIndex - 1 + GALLERY_ITEMS.length) % GALLERY_ITEMS.length);
        const showNext = () => setActiveGalleryIndex((activeGalleryIndex + 1) % GALLERY_ITEMS.length);

        return (
          <div
            className="client-gallery-lightbox"
            role="dialog"
            aria-modal="true"
            aria-labelledby="gallery-lightbox-label"
            onClick={(event) => {
              if (event.target === event.currentTarget) setActiveGalleryIndex(null);
            }}
          >
            <div className="client-gallery-lightbox-content">
              <div className="client-gallery-lightbox-header">
                <p id="gallery-lightbox-label">{item.label}</p>
                <span>{activeGalleryIndex + 1} / {GALLERY_ITEMS.length}</span>
                <button
                  className="client-gallery-lightbox-close"
                  type="button"
                  onClick={() => setActiveGalleryIndex(null)}
                  aria-label="Fechar visualização"
                  ref={galleryCloseButtonRef}
                >
                  <X size={22} />
                </button>
              </div>
              <div className="client-gallery-lightbox-media">
                <button className="client-gallery-lightbox-nav" type="button" onClick={showPrevious} aria-label="Mídia anterior">
                  <ChevronLeft size={28} />
                </button>
                {item.type === "video" ? (
                  <video key={item.src} src={item.src} poster={item.poster} autoPlay muted loop playsInline aria-label={item.label} />
                ) : (
                  <Image src={item.src} alt={item.label} width={960} height={1280} sizes="(max-width: 768px) 85vw, 1000px" />
                )}
                <button className="client-gallery-lightbox-nav" type="button" onClick={showNext} aria-label="Próxima mídia">
                  <ChevronRight size={28} />
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      <section className="client-section client-beach" id="ponta-de-pedra">
        <div className="client-section-heading centered">
          <span>Passeio próximo ao Ígas</span>
          <h2>Praia de Ponta de Pedra</h2>
          <i />
          <p className="client-beach-description">
            A poucos quilômetros do Balneário Ígas, a Praia de Ponta de Pedra é uma ótima opção para completar o passeio, apreciar a paisagem e aproveitar momentos de descanso à beira d’água.
          </p>
        </div>
        <div className="client-beach-grid">
          {[
            ["/ponta1.jpeg", "Praia com guarda-sóis e mesas à beira d’água", "beach-one"],
            ["/ponta3.jpg", "Cadeiras e palhoças na praia", "beach-two"],
            ["/ponta4.jpg", "Visitantes descansando sob palhoças", "beach-three"],
            ["/ponta10.jpg", "Vista da praia e dos quiosques junto à água", "beach-four"],
            ["/ponta6.jpg", "Vista aérea da praia e dos guarda-sóis", "beach-five"],
            ["/ponta7.jpg", "Cadeiras e palhoças à beira d’água", "beach-six"],
            ["/ponta9.jpg", "Fim de tarde na Praia de Ponta de Pedra", "beach-seven"],
          ].map(([src, label, className]) => (
            <figure className={className} key={src}>
              <Image src={src} alt={label} fill sizes="(max-width: 768px) calc(100vw - 32px), 1140px" />
              <figcaption>{label}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="client-section client-modes" id="modalidades">
        <div className="client-section-heading centered">
          <span>Opções de lazer</span>
          <h2>Modalidades disponíveis</h2>
          <i />
        </div>
        <div className="client-mode-grid">
          {modes.map((mode) => (
            <article key={mode.id}>
              <img src={mode.name.toLowerCase().includes("pernoite") ? "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=700&q=80" : "/IMG_8870.JPG.jpeg"} alt={mode.name} />
              <div>
                <h3>{mode.name}</h3>
                <p><strong>{mode.code === "OVERNIGHT" ? `A partir de ${modePrice(mode)}` : modePrice(mode)}</strong></p>
                <div className="client-tags">
                  <span>À partir das {mode.defaultStart}</span>
                  <span>{mode.code === "OVERNIGHT" ? `Saída até ${OVERNIGHT_CHECKOUT_TIME} após a última noite` : mode.durationMinutes >= 1440 ? `Saída às ${endTimeForMode(mode)} do dia seguinte` : `Saída às ${endTimeForMode(mode)}`}</span>
                </div>
                <button type="button" onClick={() => { setModeId(mode.id); document.getElementById("reserva")?.scrollIntoView({ behavior: "smooth" }); }}>Reservar</button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="client-section client-amenities">
        <div className="client-section-heading centered">
          <span>Estrutura completa</span>
          <h2>Diferenciais do Ígas</h2>
          <i />
        </div>
        <div className="client-amenity-grid">
          {[
            ["🏊", "Área de banho no igarapé"],
            ["🌿", "Contato com a natureza"],
            ["🛏️", "Dois quartos Climatizado"],
            ["📺🔊", "TV e som"],
            ["🎱", "Bilhar"],
            ["🏕️", "Ambiente para pernoite"],
            ["🏠", "Ambiente privativo"],
            ["🚗", "Estacionamento"],
            ["🔥", "Churrasqueira e Cozinha"],
            ["🪢", "Espaço para atar 16 redes"],
            ["📶", "Internet WIFI"],
            ["🍺", "Cervejeira"],
          ].map(([icon, label]) => (
            <div key={label}><b>{icon}</b><span>{label}</span></div>
          ))}
        </div>
      </section>

      <section className="client-section client-review" id="avaliacoes">
        <div className="client-section-heading centered">
          <span>Avaliações</span>
          <h2>Compartilhe sua experiência</h2>
          <i />
        </div>
        <div className="client-testimonials">
          <p className="client-testimonials-note">
            Experiências compartilhadas por visitantes do Balneário Ígas.
          </p>
          <div className="client-testimonials-viewport" role="region" aria-label="Depoimentos de clientes">
            <div className="client-testimonials-track">
              {[0, 1].map((group) => (
                <div className="client-testimonial-group" key={group} aria-hidden={group === 1}>
                  {TESTIMONIALS.map((testimonial, index) => (
                    <article className="client-testimonial-card" key={`${group}-${index}`}>
                      <div className="client-testimonial-author">
                        <span className="client-testimonial-avatar">
                          <Image
                            src={testimonial.image}
                            alt={`Foto de ${testimonial.name}`}
                            fill
                            sizes="42px"
                            style={{ transform: `scale(${testimonial.avatarScale}) translate(${testimonial.avatarOffsetX}%, ${testimonial.avatarOffsetY}%)` }}
                          />
                        </span>
                        <div>
                          <strong>{testimonial.name}</strong>
                          <small>{testimonial.visitType}</small>
                        </div>
                      </div>
                      <div className="client-testimonial-stars" aria-label={`${testimonial.rating} de 5 estrelas`}>
                        {Array.from({ length: 5 }, (_, star) => (
                          <span className={star < testimonial.rating ? "active" : ""} key={star} aria-hidden="true">★</span>
                        ))}
                      </div>
                      <p>“{testimonial.text}”</p>
                    </article>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
        <form onSubmit={submitReview}>
          <label>Nome completo *
            <input value={reviewName} onChange={(event) => setReviewName(event.target.value)} placeholder="Seu nome" />
          </label>
          <label>Tipo de visita
            <select value={reviewType} onChange={(event) => setReviewType(event.target.value)}>
              <option>Lazer</option><option>Família</option><option>Confraternização</option><option>Feriado</option>
            </select>
          </label>
          <label>Avaliação geral *
            <div className="client-stars">
              {[1, 2, 3, 4, 5].map((value) => (
                <button type="button" className={value <= rating ? "active" : ""} onClick={() => setRating(value)} key={value}>★</button>
              ))}
            </div>
          </label>
          <label>Seu comentário *
            <textarea value={reviewText} onChange={(event) => setReviewText(event.target.value)} rows={4} placeholder="Conte-nos sobre sua experiência no Ígas…" />
          </label>
          {error && <p className="client-form-error">{error}</p>}
          <button type="submit" disabled>Enviar avaliação ✦</button>
        </form>
        <div className="client-review-share">
          <button type="button" onClick={shareIgasOnWhatsApp}>
            <WhatsAppIcon size={20} />
            Compartilhar o app com amigos
          </button>
        </div>
      </section>

      <footer className="client-footer">
        <strong>♛ BALNEÁRIO ÍGAS</strong>
        <p>Seu lazer, nossa prioridade</p>
        <nav>
          <a href="#inicio">Início</a>
          <a href="#galeria">Galeria</a>
          <a href="#modalidades">Modalidades</a>
          <a href="#avaliacoes">Avaliações</a>
        </nav>
        <small>© {new Date().getFullYear()} Balneário Ígas. Todos os direitos reservados.</small>
      </footer>

      {bookingOpen && (
        <div className="client-overlay" role="dialog" aria-modal="true" aria-labelledby="booking-modal-title">
          <div className="client-modal">
            <button className="client-modal-close" type="button" onClick={() => setBookingOpen(false)} aria-label="Fechar">✕</button>
            <h2 id="booking-modal-title">Confirmar solicitação</h2>
            <p>
              {selectedMode?.name} — {selectedMode?.code === "OVERNIGHT" && !durationDays
                ? "Selecione quantas noites deseja ficar"
                : selectedMode ? modePrice(selectedMode, selectedMode.code === "OVERNIGHT" ? Number(durationDays) : 1) : ""}
              {" — "}
              {selectedMode?.code === "OVERNIGHT" && !durationDays
                ? "Selecione quantas noites deseja ficar"
                : selectedMode ? scheduleLabel(selectedMode, date, selectedMode.code === "OVERNIGHT" ? Number(durationDays) : 1, true) : ""}
            </p>
            <form className="public-booking-form" onSubmit={submit}>
              <label>Nome completo
                <input value={guestName} onChange={(event) => setGuestName(uppercaseName(event.target.value))} required maxLength={120} />
              </label>
              <label>Telefone ou WhatsApp
                <input value={guestContact} onChange={(event) => setGuestContact(event.target.value)} required maxLength={160} />
              </label>
              <div className="public-form-grid">
                <label>CPF
                  <input value={guestCpf} onChange={(event) => setGuestCpf(formatCpf(event.target.value))} placeholder="000.000.000-00" required inputMode="numeric" maxLength={14} />
                </label>
                <label>Modalidade
                  <select value={modeId} onChange={(event) => {
                    setModeId(event.target.value);
                    setDurationDays("");
                    setError("");
                  }} required>
                    {modes.map((mode) => <option value={mode.id} key={mode.id}>{modeOptionLabel(mode)}</option>)}
                  </select>
                </label>
              </div>
              {selectedMode?.code === "OVERNIGHT" && (
                <>
                  <label>Quantas noites deseja ficar
                    <select value={durationDays} onChange={(event) => setDurationDays(event.target.value)} required>
                      <option value="">Selecione a quantidade de noites</option>
                      {Array.from({ length: OVERNIGHT_MAX_NIGHTS }, (_, index) => index + 1).map((days) => (
                        <option key={days} value={days}>{days} {days === 1 ? "noite" : "noites"} — {money.format(getOvernightPrice(days))}</option>
                      ))}
                    </select>
                  </label>
                  <p className="client-deposit-note">
                    {overnightTotal !== null && overnightDeposit
                      ? <><CircleAlert className="client-deposit-alert" size={15} aria-hidden="true" /><span>Sinal (<strong>50%</strong>) para confirmar: <strong>{overnightDeposit}</strong>. Restante no check-in: <strong>{overnightDeposit}</strong>.</span></>
                      : <><CircleAlert className="client-deposit-alert" size={15} aria-hidden="true" /><span>Sinal de <strong>50%</strong> para confirmar; restante no check-in.</span></>}
                  </p>
                </>
              )}
              <div className="client-date-selection">
                <span>Data escolhida</span>
                <strong>{date ? formatDateKey(date) : "Selecione uma data no calendário"}</strong>
              </div>
              {conflict && date && selectedMode && (
                <p className="client-form-error" role="alert">
                  {selectedMode.code === "OVERNIGHT"
                    ? `Não há disponibilidade para ${durationDays} ${Number(durationDays) === 1 ? "noite" : "noites"} a partir de ${formatDateKey(date)}. Escolha outra data ou reduza a quantidade de noites.`
                    : "Esta data não está disponível para a modalidade escolhida. Escolha outra data."}
                </p>
              )}
              <label>Endereço
                <input value={guestAddress} onChange={(event) => setGuestAddress(event.target.value)} required maxLength={300} />
              </label>
              <label>Observações <span>(opcional)</span>
                <textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={2000} rows={3} />
              </label>
              {error && <p className="client-form-error">{error}</p>}
              <button className="client-modal-submit" type="submit" disabled={loading || modes.length === 0 || !date || !guestAddress.trim() || conflict || (selectedMode?.code === "OVERNIGHT" && !durationDays)}>
                {loading ? "Enviando..." : "Confirmar reserva ✦"}
              </button>
            </form>
          </div>
        </div>
      )}

      {successOpen && (
        <div className="client-success-overlay" role="dialog" aria-modal="true">
          <div>
            <span>✨</span>
            <h2>Solicitação enviada</h2>
            <p><strong>Obrigatório enviar mensagem!</strong></p>
            <p>Para finalizar sua reserva, escolha com quem deseja enviar as últimas informações!</p>
            <div className="client-whatsapp-contacts">
              {WHATSAPP_CONTACTS.map((contact) => (
                <a
                  className="client-whatsapp-contact"
                  href={`https://wa.me/${contact.phone}?text=${encodeURIComponent(whatsappMessage)}`}
                  key={contact.name}
                  target="_blank"
                  rel="noreferrer"
                  onClick={returnToClientHome}
                >
                  <span className="client-whatsapp-contact-icon" aria-hidden="true"><WhatsAppIcon size={23} /></span>
                  <span className="client-whatsapp-contact-info">
                    <strong>{contact.name}</strong>
                    <small>{contact.displayPhone}</small>
                  </span>
                  <span className="client-whatsapp-contact-action">Conversar <span aria-hidden="true">↗</span></span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
