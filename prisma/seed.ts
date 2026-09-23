import { PrismaClient } from "@prisma/client";
import { withRating } from "../src/lib/rating";

const prisma = new PrismaClient();
const empty = { context: null, dataMaterials: null, expectedResult: null, successCriteria: null, constraints: null, users: null, contact: null };

// Detail varies in the draft text; structured rating fields remain empty.
const drafts = [
  ["Учёт заявок мастерской", "Хотим перестать терять заявки на ремонт."],
  ["Запись клиентов салона", "Администратор записывает клиентов в блокнот и путает время. Нужна запись для двух мастеров."],
  ["Анализ продаж пекарни", "Остаётся непроданная выпечка. Есть таблицы продаж за полгода. Хотим понять, сколько готовить по дням недели. Отчётом будет пользоваться управляющий."],
  ["Онбординг волонтёров", "Новички задают одинаковые вопросы. Есть инструкции в документах. Нужен справочник с поиском. Успех — ответ на 8 из 10 вопросов без координатора. Срок месяц, без персональных данных."],
  ["Контроль остатков магазина", "Менеджер тратит час на сверку остатков. Дадим обезличенный CSV за три месяца. Нужен отчёт о товарах для заказа. Успех — сверка за 15 минут, все товары ниже минимума отмечены. Срок четыре недели, бесплатные инструменты. Пользователи — два менеджера. Контакт store-demo@example.com, еженедельный созвон."],
];

const cards = [
  { title: "Панель заявок сервисного центра", rawDraft: "Нужна единая панель обращений для диспетчера.", context: "Заявки из почты и таблиц переносятся вручную и теряются.", dataMaterials: "300 обезличенных заявок и список статусов.", expectedResult: "Панель с поиском, исполнителями и историей статусов.", successCriteria: "Все тестовые заявки доступны, поиск занимает до 5 секунд.", constraints: "Шесть недель, бесплатные инструменты.", users: "Диспетчеры сервисного центра.", contact: "service-demo@example.com; созвон по пятницам." },
  { title: "Прогноз спроса для кофейни", rawDraft: "Хотим сократить списания десертов.", context: "Закупки планируются по опыту бариста, остатки списываются.", dataMaterials: "CSV продаж и списаний за год, календарь акций.", expectedResult: "Прогноз спроса на неделю и инструкция обновления.", successCriteria: "Ошибка на отложенном месяце ниже среднего по дням недели.", constraints: "Четыре недели, только предоставленные данные.", users: "Управляющий и сотрудник закупок.", contact: "coffee-demo@example.com; вопросы по почте." },
  { title: "Навигатор по стажировкам", rawDraft: "Студенты не находят подходящие стажировки.", context: "Карьерный центр пересылает предложения в разрозненные чаты.", dataMaterials: "50 учебных объявлений и список направлений подготовки.", expectedResult: "Каталог стажировок с поиском по направлению и формату.", successCriteria: "Пять студентов находят стажировку за две минуты.", constraints: "Пять недель, без сбора резюме.", users: "Студенты и сотрудники карьерного центра.", contact: "career-demo@example.com; демонстрация раз в две недели." },
  { title: "Проверка товарных карточек", rawDraft: "Нужно находить пропущенные характеристики товаров.", context: "Контент-менеджер вручную проверяет сотни карточек.", dataMaterials: "1000 учебных товаров и требования по категориям.", expectedResult: "Валидатор CSV и отчёт об ошибках.", successCriteria: "Найдены все пропуски обязательных полей контрольного набора.", constraints: "Три недели, локальный запуск, исходные файлы не менять.", users: "Контент-менеджеры магазина.", contact: "content-demo@example.com; обсуждение по почте." },
  { title: "Проверка расписания учебного центра", rawDraft: "Нужно выявлять пересечения аудиторий и преподавателей.", context: "Конфликты таблицы расписания обнаруживаются перед занятиями.", dataMaterials: "Учебное расписание, аудитории и доступность преподавателей.", expectedResult: "Веб-прототип загрузки CSV и проверки конфликтов.", successCriteria: "Обнаружены все 20 внесённых конфликтов без ложных срабатываний.", constraints: "Шесть недель, без интеграции с внутренней системой.", users: "Администратор расписания.", contact: "schedule-demo@example.com; созвон по средам." },
];

const proposals = [
  { teamName: "Команда Поток", idea: "Объединить заявки в канбан-панели.", plan: "Изучить выгрузку, согласовать статусы, собрать прототип и проверить с диспетчером.", deadline: "6 недель", link: "https://example.com/demo/flow" },
  { teamName: "Data Beans", idea: "Сравнить сезонный прогноз и модель спроса.", plan: "Очистить данные, построить базовый прогноз, сравнить модели и написать инструкцию.", deadline: "4 недели", link: "https://example.com/demo/beans" },
  { teamName: "Карьерный компас", idea: "Каталог стажировок с быстрыми фильтрами.", plan: "Провести интервью, собрать макет, реализовать поиск и проверить со студентами.", deadline: "5 недель", link: "https://example.com/demo/career" },
  { teamName: "Чистые данные", idea: "Проверять товары по правилам категории.", plan: "Описать правила, реализовать валидатор, подготовить контрольные примеры и отчёт.", deadline: "3 недели", link: "https://example.com/demo/quality" },
  { teamName: "Без пересечений", idea: "Показать конфликты расписания на временной шкале.", plan: "Разобрать CSV, реализовать проверку интервалов, собрать интерфейс и проверить конфликты.", deadline: "6 недель и итоговая демонстрация", link: "https://example.com/demo/schedule" },
];

async function main() {
  await prisma.$transaction(async tx => {
    for (const [index, [title, rawDraft]] of drafts.entries()) {
      const id = `seed-draft-${index + 1}`;
      const data = withRating({ ...empty, title, rawDraft, confirmed: false });
      await tx.businessTask.upsert({ where: { id }, create: { id, ...data }, update: data });
    }
    for (const [index, card] of cards.entries()) {
      const id = `seed-card-${index + 1}`;
      const data = withRating({ ...card, confirmed: true });
      await tx.businessTask.upsert({ where: { id }, create: { id, ...data }, update: data });
      const proposalId = `seed-proposal-${index + 1}`;
      const proposal = { ...proposals[index], taskId: id };
      // Preserve an existing business choice when rerunning the seed.
      await tx.proposal.upsert({ where: { id: proposalId }, create: { id: proposalId, ...proposal }, update: proposal });
    }
  });
  console.log("Seed: 5 черновиков (0/100), 5 подтверждённых карточек (100/100), 5 откликов.");
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); });
