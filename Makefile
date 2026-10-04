RUN:=yarn

NAME:=ai-monitor

-include .env
export NPM_TOKEN

# STYLE BOX #
ERROR_BOX=\x1b[41m
SUCCESS_BOX=\x1b[42m
RESET_BOX=\x1b[0m
WARN_BOX=\x1b[30;43m

# STYLE COLOR #
ERROR_TEXT=\x1b[31m
SUCCESS_TEXT=\x1b[32m
RESET_TEXT=\x1b[0m
WARN_TEXT=\x1b[33m
INFO_TEXT=\033[36m

# SYMBOLS
PRISM=\342\227\206
ARROW=\342\226\270
CHECK=\342\234\224
TIMES=\342\234\226

# ------------------------------------------------------------------------------------ #

# Função para executar comandos dentro do workspace
define run_in_workspace
		@workspace='@$(NAME)/$(1)'; \
	echo "------------------------------------------------------------------------------"; \
    printf "${INFO_TEXT}${PRISM} $${workspace}\n"; \
    printf "${WARN_TEXT}${ARROW} $(2) $(3)${RESET_TEXT}\n"; \
    start=$$(date +%s); \
    started_at=$$(date '+%H:%M:%S'); \
    echo "Started at: " "$$started_at"; \
    echo "------------------------------------------------------------------------------"; \
    $(RUN) workspace @$(NAME)/$(1) $(2) $(3); \
    status=$$?; \
    end=$$(date +%s); \
    finished_at=$$(date '+%H:%M:%S'); \
    elapsed=$$((end - start)); \
    minutes=$$((elapsed / 60)); \
    seconds=$$((elapsed % 60)); \
    echo "------------------------------------------------------------------------------"; \
	if [ "$$status" -eq 0 ]; then \
        printf "${SUCCESS_TEXT}${CHECK} [SUCCESS] $(2) $(3)${RESET_TEXT}\n"; \
    else \
        printf "${ERROR_TEXT}${TIMES} [ERROR] $(2) $(3)${RESET_TEXT}\n"; \
    fi; \
    printf "Duration: %dm %02ds\n" "$$minutes" "$$seconds"; \
    printf "Exit code: %s\n" "$$status"; \
    echo "------------------------------------------------------------------------------"; \
    exit "$$status"
endef

# Extrair parâmetros dos argumentos posicionais
.PHONY: run
run:
	$(eval PROJECT := $(word 2, $(MAKECMDGOALS)))
	$(eval CMD := $(wordlist 3, $(words $(MAKECMDGOALS)), $(MAKECMDGOALS)))
	$(call run_in_workspace,$(PROJECT),$(CMD))

# Para evitar que make tente interpretar os argumentos como alvos
%:
	@:

# ----------------------------------------------- #

install:
	$(RUN)

# -------------------- LINK UI (@iziui/react) ------------------- #

# Caminho relativo (a partir da raiz do eventapp) para o pacote react do projeto ui.
UI_REACT_PATH := ../iziui/ui/packages/apps/react

link-ui:
	@node -e "const fs=require('fs');const p='./package.json';const j=JSON.parse(fs.readFileSync(p));j.resolutions=j.resolutions||{};j.resolutions['@iziui/react']='link:$(UI_REACT_PATH)';fs.writeFileSync(p,JSON.stringify(j,null,2)+'\n')"
	@printf "${WARN_TEXT}Linking @iziui/react -> $(UI_REACT_PATH)${RESET_TEXT}\n"
	@$(RUN) install
	@printf "${SUCCESS_BOX} SUCCESS ${RESET_BOX}: @iziui/react linkado. Rode 'make ui-watch' para build ao vivo.\n"

unlink-ui:
	@node -e "const fs=require('fs');const p='./package.json';const j=JSON.parse(fs.readFileSync(p));if(j.resolutions){delete j.resolutions['@iziui/react'];if(Object.keys(j.resolutions).length===0)delete j.resolutions;}fs.writeFileSync(p,JSON.stringify(j,null,2)+'\n')"
	@printf "${WARN_TEXT}Removendo link do @iziui/react (voltando ao registry)${RESET_TEXT}\n"
	@$(RUN) install
	@printf "${SUCCESS_BOX} SUCCESS ${RESET_BOX}: @iziui/react voltou ao registry.\n"