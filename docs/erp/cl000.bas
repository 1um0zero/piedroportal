!----------------------------------------------------------------------------------------------------------------
! CL000 - Encomendas do Piedro Portal (era Claude, marco zero)
!
! Programa escrito de raiz pelo Claude (claude.com/claude-code) a partir do
! conhecimento do PP0001. Fala APENAS com o Piedro Portal (Next.js/Supabase):
!   . GET  /api/erp/orders          - busca encomendas (token fixo, sem OAuth2)
!   . POST /api/erp/orders/ack      - confirma importacao (substitui o teste
!                                     "productionstate vazio = nova")
!   . POST /api/erp/orders/status   - estados, Piedro Order, tracking
! Sem Dataverse: sem OAuth2, sem FormattedValue, sem resolucao de accounts
! (o erp_code do cliente ja vem resolvido), additions em lista 1:N.
!
! Reutiliza as pecas comuns da casa:
!   . dataverse1.gen - dialog (grelha + filtros + botoes)
!   . dataverse1.bpi - catalogo de refs internas, config, structs partilhadas
!   . portal1.bpi    - REST do portal (FN'portal'*)
!   . pp001.bpi      - xtree + parsing do portal (FN'claude'*) + importacao
!
!EDIT HISTORY
! 2026.06.12 - 1.0(000) - [claude] criacao
!----------------------------------------------------------------------------------------------------------------


                                   PROGRAM CL000,1.0(000)

!--------------------------
!{INCLUDES}
!--------------------------
++include uzbpi:geral.bpi
++include uzadm:admin.bpi
++include sigc:gcgeral.bpi
++include icgeral.bpi

!--------------------------
!{MAP}
!--------------------------
++include sigc:invdsc.map
++include sigc:refalt.map
++include additions.stru
!--------------------------
map1 enc, enccli'structure
map1 artigo, ST_invmas
map1 familia, tipfam'structure
map1 ftec, ftcab'structure

dimx $refalt, ordmap(varstr; varstr)
dimx $art'descricao, ordmap(varstr; varstr)
dimx descricao'cliente'cols$(6),s,0,AUTO_EXTEND

! buffer legado do Dataverse: nao e usado no fluxo do portal, mas as funcoes
! antigas do pp001.bpi referenciam-no e tem de existir para compilar
dimx $online'order, ordmap(varstr; varx)

dimx add1(2), ST_shoe'additions1
dimx add3(2), ST_shoe'additions3
map1 size'fields1,b,4,sizeof(ST_shoe'additions1.fields$)
map1 size'fields3,b,4,sizeof(ST_shoe'additions3.fields$)

map1 response$,s,0
map1 cmd'linha$,s,80                     ! [claude] CMDLIN completo (para detetar "LIVE")
map1 parametros'externos$
   map2 pe'debug$,s,1

map1 tem'filtro'orders,b,4
map1 raw'data,b,1

!--------------------------
++include dataverse1.gen
++include dataverse1.bpi
++include portal1.bpi
++include pp001.bpi
!--------------------------
!{EVENTWAIT}
!--------------------------

      cmd'linha$ = CMDLIN
      parametros'externos$ = cmd'linha$                 ! mantem pe'debug$ = 1o caracter (compat)

      ! [claude] Modo de escrita: LIVE so quando o programa e chamado com o
      ! argumento "LIVE" no CMDLIN. Sem argumento => VALIDACAO (le, nao escreve).
      claude'live = (instr(1, ucs(cmd'linha$), "LIVE")>0)

      if pe'debug$#"" then
         TRACE.PRINT "MODO DEBUG: nada sera atualizado no Portal"
      endif

      call config'csv(INIX_READ)

      ! Portal Piedro - este programa e exclusivo do portal.
      ! O token e o ERP_API_TOKEN definido no Vercel; sem ele o programa
      ! nao arranca (em alternativa pode vir do portal.cfg, [PORTAL] url/token).
      cfg'portal'url$ = "https://portal.piedro.pt"             ! dominio canonico (vercel.app faz 307 e o xcall HTTP perde o Bearer no redirect)
      cfg'portal'token$ = ""                   ! TODO: ERP_API_TOKEN (env Vercel)

      if FN'portal'config()=0 then
         xcall sbxmsg, 0, "Falta configurar o token do Portal (cfg'portal'token$ no CL000 ou portal.cfg).", "Portal nao configurado", 0, EXCLAMACAO
         end
      endif

      ! [claude] Aviso do modo de escrita. LIVE pede confirmacao (escreve a serio).
      if claude'live then
         xcall sbxmsg, MSG'EXIT, "MODO LIVE: importar vai ESCREVER no Portal (estados + ack)." + CRLF$ + "Continuar?", "Modo LIVE", OK_CANCEL, EXCLAMACAO
         if MSG'EXIT#0 then
            end
         endif
      else
         TRACE.PRINT "MODO VALIDACAO: le do Portal mas NAO escreve nada (correr com argumento LIVE para escrever)."
      endif

      call FN'lista'transportadoras$(LISTA_XTREE, lista'transportadoras$, so'links=1)

      dataverse'label$ = "PIEDRO Portal 2.0"               ! [claude] titulo da janela
      call dataverse_load'dialog(dataverse'dlgid,dataverse'label$)
      call xtree'dataverse(XTROP_CREATE)

      do
         xcall AUI,AUI_EVENTWAIT,dataverse'dlgid,set'focus,exitcode,EVW_DESCEND+EVW_EDIT+EVW_EXCDFOCUS+EVW_EXCDINOUT

         if (abs(exitcode)>dataverse_EXITCODE_BASE AND abs(exitcode)<=dataverse_LAST_EXITCODE) then
            exitcode = FN'dataverse_handle'controls(EDIT_MODE,abs(exitcode))
         endif

         SWITCH exitcode
         CASE VK_XTREE
            call xtree'dataverse(XTROP_REPLACE, EDIT_, exitcode)
            exit
         CASE VK_REFRESH
            call FN'emprocessamento(1, avi'id)
            call config'csv'catalogo(INIX_READ)

            raw'data = 0
            if FN'portal'get'orders(FN'claude'filtro$(), response$)>=0 then
               if FN'claude'get'online'values(response$)=0 then
                  xcall sbxmsg, 0, "Nao ha encomendas no Portal para este pedido. Valide os filtros selecionados.", "Query vazio", 0, INFORMACAO
               endif
            endif

            call FN'emprocessamento(0, avi'id)
            call xtree'dataverse(XTROP_REPLACE, EDIT_, exitcode, raw'data)
            exit
         ENDSWITCH
      loop until exitcode=1

      xcall AUI,AUI_CONTROL,CTLOP_DEL,dataverse'dlgid
end


!{GEN PROCEDURES}
!--------------------------
! Hooks do dialog (chamados pelo codigo gerado em dataverse1.gen).
! Sem casos especiais neste programa - tudo segue o fluxo normal.
!--------------------------

PROCEDURE dataverse_fld'pre(op as b1,fname$ as s24,do'nothing as b1)
++pragma auto_extern

STRSIZ 24                                                    ! needed for the SWITCH evaluation

       if op=DISPLAY_MODE then                ! only on display
          SWITCH fname$
          DEFAULT
                 exit
          ENDSWITCH
       endif

       xputarg 1,op
       xputarg 2,fname$
       xputarg 3,do'nothing
ENDPROCEDURE


FUNCTION FN'dataverse_fld'post(op as b1,exitcode as f6,fname$ as s24)
++pragma auto_extern

map1 fnext$,s,24

       fnext$ = fname$

STRSIZ 24                                                    ! needed for the SWITCH evaluation

       if (op<INFOP_DISPLAY AND exitcode#1) then    ! only on edit
          SWITCH fname$
          DEFAULT
                 exit
          ENDSWITCH

          if (exitcode#FIELD_INVALID AND (abs(exitcode)>dataverse_EXITCODE_BASE AND abs(exitcode)<=dataverse_LAST_EXITCODE)) then
             fnext$ = FN'dataverse_fxid2name$(exitcode)
             SWITCH fnext$
             DEFAULT
                    exit
             ENDSWITCH
          endif
       endif

       FN'dataverse_fld'post = exitcode
       xputarg 3,fnext$

ENDFUNCTION


!--------------------------
! Preco por tamanho a partir da ficha de custos (logica identica ao PP0001 -
! e usada pelo FN'trata'ref'interna do pp001.bpi ao sugerir a ref interna).
!--------------------------

FUNCTION FN'get'tam'preco(tam$ as s5, x) as f
++pragma auto_extern
map1 catalogo, ST_power'catalogo
map1 custos, ftcustos'structure
map1 fhcu, isama'file'handler

      if tam$="" then
         EXITFUNCTION
      endif

      xgetarg 2, catalogo.buffer

      xcall strip, catalogo.col'cr56f_gender$

      xcall strip, tam$
      %descricao'ft$ = ucs(FN'get'descricao'linha'ano'estacao$(catalogo.ref'interna$))
      %style'piedro$ = FN'left'str$(catalogo.ref'style'color$, ".", -1)
      %closure$ = strip(catalogo.col'cr56f_closure$)
      %modelo$ = catalogo.ref'interna$[1; 5]

      custos.modelo$ = %modelo$ + space(15)
      custos.versao$ = "9000"

      open #FN'free'channel(custos.canal), custos.file$, isamp'indexed, fhcu.recno, fhcu.status, READ'ONLY

      GET #custos.canal, ISAM'KEY(0)=custos.key1$, custos.buffer
      do
         GET'NEXT #custos.canal, custos.buffer
         if (fhcu.status=ISAM_NF OR strip(custos.modelo$)#%modelo$) then
            exit
         endif

         %descricao'custo$ = FN'get'descricao'linha'ano'estacao$(custos.key1$)
         if FN'valida'descricao'ft(%descricao'custo$, %descricao'ft$, catalogo.buffer)=0 then
            REPEAT
         endif

         for %i=1 to 6
            if custos.buffer'custos.ve'tam$(%i)="" then
               exit
            endif

            xcall strip, custos.buffer'custos.ve'tam$(%i)

            %pri'tam$ = ife$(FN'left'str$(custos.buffer'custos.ve'tam$(%i), "/", -1), custos.buffer'custos.ve'tam$(%i))
            %ult'tam$ = FN'right'str$(custos.buffer'custos.ve'tam$(%i), "/", 1)

            xcall strip, %pri'tam$
            xcall strip, %ult'tam$

            custos.buffer'custos.ve'tam$(%i) = xfunc$("repstr", custos.buffer'custos.ve'tam$(%i), ",5", "5")
            custos.buffer'custos.ve'tam$(%i) = xfunc$("repstr", custos.buffer'custos.ve'tam$(%i), ",", "5")

            if len(%pri'tam$)=1 then
               %pri'tam$ = %pri'tam$ using "#Z"
            endif
            if len(%ult'tam$)=1 then
               %ult'tam$ = %ult'tam$ using "#Z"
            endif

            if (len(%ult'tam$)=2 AND %ult'tam$[2; 1]="5" AND %ult'tam$[1; 1]>"4") then
               %ult'tam$ = %ult'tam$ using "#ZZ"
            endif

            if tam$<%pri'tam$ then
               REPEAT
            elseif tam$>%ult'tam$ then
               REPEAT
            endif

            %escalao$ = %pri'tam$
            if %ult'tam$#"" then
               %escalao$ += "/" + %ult'tam$
            endif

            %custo = val($valor'custo(%closure$+%escalao$))
            if %custo=0 then
               %custo = val($valor'custo(%closure$))
               if %custo=0 then
                  TRACE.PRINT "custo ZERO: closure=["+%closure$+"] escalao=["+%escalao$+"]"
                  exit
               endif
            endif

            %conta = custos.buffer'custos.ve'custo(%i)
            %conta += %custo

            if instr(1, %descricao'custo$, "STRETCH") then
               %conta += $valor'custo("STRETCH")
            endif

            %conta = %conta * cfg'precos'percentagem using "#########.##"

            ! adultos: arredonda ao meio euro acima; KIDS fica como esta
            if catalogo.col'cr56f_gender$#"KIDS" then
               if %conta#int(%conta) then
                  .FN = (%conta - int(%conta)) using "#######.#"

                  if .FN<=.5 then
                     %conta = int(%conta) + 0.5
                  else
                     %conta = int(%conta + .5)
                  endif
               endif
            endif

            .FN = %conta

            exit
         next %i

      loop while .FN=0

      close #custos.canal
ENDFUNCTION


FUNCTION FN'valida'descricao'ft(descricao'custo$ as s0, descricao'ft$ as s0, x) as b1
++pragma auto_extern
map1 catalogo, ST_power'catalogo

      xgetarg 2, catalogo.buffer

      if instr(1, descricao'custo$, catalogo.ref'style'color$[1; 4] + " " + $closure_construction_codes(catalogo.col'cr56f_closure$+catalogo.construction$) + " " + catalogo.col'cr56f_stylecolorid$) then
         EXITFUNCTION
      endif

      if instr(1, descricao'ft$, "STRETCH") then
         if instr(1, descricao'custo$, "STRETCH")=0 then
            EXITFUNCTION
         endif
      elseif instr(1, descricao'custo$, "STRETCH") then
         EXITFUNCTION
      endif

      if catalogo.construction$="REHABILITATION" then
         if instr(1, descricao'custo$, catalogo.ref'style'color$[1; 4] + " " + $closure_construction_codes(catalogo.col'cr56f_closure$) + " " + catalogo.col'cr56f_stylecolorid$) then
            EXITFUNCTION
         endif
      endif

      if instr(1, descricao'custo$, " "+$constructions'short(catalogo.construction$))=0 then
         .FN = 1
      elseif instr(1, descricao'custo$, " "+catalogo.col'cr56f_closure$[1; 3])=0 then
         .FN = 1
      endif

ENDFUNCTION
