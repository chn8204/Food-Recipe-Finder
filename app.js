const API_URL = "https://www.themealdb.com/api/json/v1/1/search.php";

const searchForm = document.getElementById("searchForm");
const foodInput = document.getElementById("foodInput");
const searchButton = document.getElementById("searchButton");
const result = document.getElementById("result");
const statusMessage = document.getElementById("status");

let activeRequest;

function setStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.classList.toggle("error", isError);
}

function getIngredients(meal) {
  const ingredients = [];

  for (let index = 1; index <= 20; index += 1) {
    const ingredient = meal[`strIngredient${index}`]?.trim();

    if (ingredient) {
      const measure = meal[`strMeasure${index}`]?.trim();
      ingredients.push(measure ? `${measure} ${ingredient}` : ingredient);
    }
  }

  return ingredients;
}

function createRecipeCard(meal) {
  const card = document.createElement("article");
  card.className = "recipe-card";

  if (meal.strMealThumb) {
    const image = document.createElement("img");
    image.className = "recipe-image";
    image.src = meal.strMealThumb;
    image.alt = meal.strMeal ? `${meal.strMeal} recipe` : "Recipe";
    image.loading = "lazy";
    image.addEventListener("error", () => image.remove(), { once: true });
    card.appendChild(image);
  }

  const content = document.createElement("div");
  content.className = "recipe-content";

  const metadata = document.createElement("div");
  metadata.className = "recipe-meta";
  [meal.strCategory, meal.strArea].filter(Boolean).forEach((value) => {
    const badge = document.createElement("span");
    badge.textContent = value;
    metadata.appendChild(badge);
  });
  content.appendChild(metadata);

  const title = document.createElement("h3");
  title.className = "recipe-title";
  title.textContent = meal.strMeal || "Untitled recipe";
  content.appendChild(title);

  const instructions = (meal.strInstructions || "").trim();
  const description = document.createElement("p");
  description.className = "recipe-description";
  description.textContent = instructions
    ? `${instructions.slice(0, 170).trim()}${instructions.length > 170 ? "…" : ""}`
    : "Open the recipe details for ingredients and instructions.";
  content.appendChild(description);

  const details = document.createElement("details");
  details.className = "recipe-details";
  const summary = document.createElement("summary");
  summary.textContent = "Ingredients & instructions";
  details.appendChild(summary);

  const ingredients = getIngredients(meal);
  if (ingredients.length > 0) {
    const ingredientsHeading = document.createElement("h4");
    ingredientsHeading.textContent = `Ingredients (${ingredients.length})`;
    details.appendChild(ingredientsHeading);

    const list = document.createElement("ul");
    list.className = "ingredient-list";
    ingredients.forEach((ingredient) => {
      const item = document.createElement("li");
      item.textContent = ingredient;
      list.appendChild(item);
    });
    details.appendChild(list);
  }

  const instructionsHeading = document.createElement("h4");
  instructionsHeading.textContent = "Method";
  details.appendChild(instructionsHeading);

  const instructionsText = document.createElement("p");
  instructionsText.className = "instructions";
  instructionsText.textContent = instructions || "No cooking instructions are available.";
  details.appendChild(instructionsText);
  content.appendChild(details);

  const links = document.createElement("div");
  links.className = "recipe-links";
  [
    ["strSource", "Full recipe"],
    ["strYoutube", "Watch video"],
  ].forEach(([key, label]) => {
    const url = meal[key];
    if (!url || !/^https?:\/\//i.test(url)) {
      return;
    }

    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = label;
    links.appendChild(link);
  });
  if (links.childElementCount > 0) {
    content.appendChild(links);
  }

  card.appendChild(content);
  return card;
}

async function searchFood(query) {
  const foodName = query.trim();

  if (!foodName) {
    result.replaceChildren();
    setStatus("Enter a dish to find recipes.", true);
    foodInput.focus();
    return;
  }

  if (activeRequest) {
    activeRequest.abort();
  }

  const request = new AbortController();
  activeRequest = request;
  searchButton.disabled = true;
  result.setAttribute("aria-busy", "true");
  result.replaceChildren();
  setStatus(`Looking for recipes matching “${foodName}”…`);

  try {
    const url = new URL(API_URL);
    url.searchParams.set("s", foodName);

    const response = await fetch(url, { signal: request.signal });
    if (!response.ok) {
      throw new Error(`Recipe service returned HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!Array.isArray(data.meals) || data.meals.length === 0) {
      setStatus(`No recipes found for “${foodName}”. Try another dish.`);
      return;
    }

    const cards = document.createDocumentFragment();
    data.meals.forEach((meal) => cards.appendChild(createRecipeCard(meal)));
    result.appendChild(cards);
    setStatus(`${data.meals.length} ${data.meals.length === 1 ? "recipe" : "recipes"} found for “${foodName}”.`);
  } catch (error) {
    if (error.name === "AbortError") {
      return;
    }

    console.error("Recipe search failed:", error);
    setStatus("Recipes could not be loaded. Check your connection and try again.", true);
  } finally {
    if (activeRequest === request) {
      activeRequest = undefined;
      searchButton.disabled = false;
      result.setAttribute("aria-busy", "false");
    }
  }
}

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  searchFood(foodInput.value);
});

document.querySelectorAll(".suggestion").forEach((button) => {
  button.addEventListener("click", () => {
    foodInput.value = button.dataset.query;
    searchFood(foodInput.value);
  });
});
