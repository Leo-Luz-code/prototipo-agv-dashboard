document.addEventListener("DOMContentLoaded", () => {
  console.log("[RFID MANAGER] 🚀 Inicializando gerenciador de tags RFID...");

  // Elementos do formulário
  const inputTagId = document.getElementById("input-tag-id");
  const inputItemName = document.getElementById("input-item-name");
  const btnRegisterTag = document.getElementById("btn-register-tag");
  const rfidList = document.getElementById("rfid-list");

  // Elementos da leitura atual
  const rfidDataElement = document.getElementById("rfid-data");
  const btnCopyTagToRegister = document.getElementById(
    "btn-copy-tag-to-register"
  );

  // Drawer behavior is handled by js/drawer.js (shared)

  /**
   * Carrega e exibe todas as tags cadastradas
   */
  async function loadTags() {
    try {
      const response = await fetch("/api/rfid/tags");
      const data = await response.json();

      if (data.success) {
        displayTags(data.tags);
      } else {
        console.error("[RFID MANAGER] Erro ao carregar tags:", data.error);
      }
    } catch (error) {
      console.error("[RFID MANAGER] Erro ao carregar tags:", error);
    }
  }

  /**
   * Exibe as tags na lista
   */
  function displayTags(tags) {
    if (tags.length === 0) {
      rfidList.innerHTML =
        '<p class="rfid-list-empty">Nenhum item cadastrado</p>';
      return;
    }

    rfidList.innerHTML = tags
      .map(
        (tag) => `
        <div class="rfid-item" data-tag-id="${tag.tagId}">
          <div class="rfid-item-info">
            <span class="rfid-item-tag">${tag.tagId}</span>
            <input type="text" class="rfid-item-name-input" value="${tag.name}" data-tag-id="${tag.tagId}" />
          </div>
          <div class="rfid-item-actions">
            <button class="btn-rfid-save btn-small" data-tag-id="${tag.tagId}">💾</button>
            <button class="btn-rfid-delete btn-small" data-tag-id="${tag.tagId}">🗑️</button>
          </div>
        </div>
      `
      )
      .join("");

    // Adicionar event listeners aos botões
    document.querySelectorAll(".btn-rfid-save").forEach((btn) => {
      btn.addEventListener("click", handleSaveTag);
    });

    document.querySelectorAll(".btn-rfid-delete").forEach((btn) => {
      btn.addEventListener("click", handleDeleteTag);
    });
  }

  /**
   * Cadastra uma nova tag
   */
  async function handleRegisterTag() {
    const tagId = inputTagId.value.trim().toUpperCase();
    const itemName = inputItemName.value.trim();

    if (!tagId || !itemName) {
      alert("Por favor, preencha todos os campos!");
      return;
    }

    try {
      console.log(`[RFID MANAGER] Cadastrando tag: ${tagId} -> ${itemName}`);

      const response = await fetch("/api/rfid/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagId, itemName }),
      });

      const data = await response.json();

      if (data.success) {
        console.log("[RFID MANAGER] ✅ Tag cadastrada com sucesso!");
        inputTagId.value = "";
        inputItemName.value = "";
        loadTags(); // Recarrega a lista
        showNotification("Tag cadastrada com sucesso!", "success");
      } else {
        console.error("[RFID MANAGER] ❌ Erro:", data.error);
        alert(`Erro: ${data.error}`);
      }
    } catch (error) {
      console.error("[RFID MANAGER] Erro ao cadastrar tag:", error);
      alert("Erro ao cadastrar tag!");
    }
  }

  /**
   * Salva alterações em uma tag (renomear)
   */
  async function handleSaveTag(event) {
    const tagId = event.target.dataset.tagId;
    const input = document.querySelector(
      `.rfid-item-name-input[data-tag-id="${tagId}"]`
    );
    const newName = input.value.trim();

    if (!newName) {
      alert("O nome do item não pode estar vazio!");
      return;
    }

    try {
      console.log(`[RFID MANAGER] Renomeando tag: ${tagId} -> ${newName}`);

      const response = await fetch(`/api/rfid/tags/${tagId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemName: newName }),
      });

      const data = await response.json();

      if (data.success) {
        console.log("[RFID MANAGER] ✅ Tag renomeada com sucesso!");
        showNotification("Tag atualizada!", "success");
      } else {
        console.error("[RFID MANAGER] ❌ Erro:", data.error);
        alert(`Erro: ${data.error}`);
      }
    } catch (error) {
      console.error("[RFID MANAGER] Erro ao renomear tag:", error);
      alert("Erro ao atualizar tag!");
    }
  }

  /**
   * Deleta uma tag
   */
  async function handleDeleteTag(event) {
    const tagId = event.target.dataset.tagId;

    if (!confirm(`Deseja realmente deletar a tag ${tagId}?`)) {
      return;
    }

    try {
      console.log(`[RFID MANAGER] Deletando tag: ${tagId}`);

      const response = await fetch(`/api/rfid/tags/${tagId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        console.log("[RFID MANAGER] ✅ Tag deletada com sucesso!");
        loadTags(); // Recarrega a lista
        showNotification("Tag deletada!", "success");
      } else {
        console.error("[RFID MANAGER] ❌ Erro:", data.error);
        alert(`Erro: ${data.error}`);
      }
    } catch (error) {
      console.error("[RFID MANAGER] Erro ao deletar tag:", error);
      alert("Erro ao deletar tag!");
    }
  }

  /**
   * Mostra uma notificação temporária
   */
  function showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add("show");
    }, 10);

    setTimeout(() => {
      notification.classList.remove("show");
      setTimeout(() => notification.remove(), 300);
    }, 2000);
  }

  /**
   * Copia o valor da tag lida para o campo de cadastro
   */
  function copyTagToRegister() {
    const tagValue = rfidDataElement.textContent.trim();

    // Verifica se há uma tag válida (não é "Nenhuma" ou vazio)
    if (!tagValue || tagValue === "Nenhuma" || tagValue === "---") {
      showNotification("Nenhuma tag para copiar!", "error");
      return;
    }

    // Copia o valor para o campo de cadastro
    inputTagId.value = tagValue;

    // Foca no campo de nome do item para continuar o cadastro
    inputItemName.focus();

    // Feedback visual
    showNotification("Tag copiada para cadastro! ✅", "success");

    console.log(`[RFID MANAGER] ✅ Tag ${tagValue} copiada para cadastro`);
  }

  // Event listeners
  btnRegisterTag.addEventListener("click", handleRegisterTag);

  // Botão de copiar tag para cadastro
  if (btnCopyTagToRegister) {
    btnCopyTagToRegister.addEventListener("click", copyTagToRegister);
  }

  // Permite cadastrar pressionando Enter
  inputItemName.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      handleRegisterTag();
    }
  });

  // Carrega as tags ao iniciar
  loadTags();

  /**
   * Atualiza o estado do botão de copiar tag baseado no conteúdo
   */
  function updateCopyButtonState() {
    const tagValue = rfidDataElement.textContent.trim();
    const isValidTag = tagValue && tagValue !== "Nenhuma" && tagValue !== "---";

    if (btnCopyTagToRegister) {
      btnCopyTagToRegister.disabled = !isValidTag;
    }
  }

  // Observa mudanças no elemento rfid-data para habilitar/desabilitar o botão
  if (rfidDataElement && btnCopyTagToRegister) {
    // Estado inicial
    updateCopyButtonState();

    // Observador de mudanças
    const observer = new MutationObserver(updateCopyButtonState);
    observer.observe(rfidDataElement, {
      childList: true,
      characterData: true,
      subtree: true,
    });
  }

  console.log("[RFID MANAGER] ✅ Gerenciador inicializado!");
});
