// Server functions para gestão hierárquica (admin principal / subadmin / embaixador).
// Todas as funções exigem sessão autenticada (requireSupabaseAuth). A autorização
// de fato acontece nas RPCs do banco (SECURITY DEFINER), que verificam nível e
// permissões — o servidor apenas repassa a chamada com o token do usuário.
// Nada de service_role é exposto ao cliente.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ------- Contexto do usuário logado -------
// Retorna informação suficiente para o gate administrativo decidir:
//  - has_profile / perfil_ativo / perfil_suspenso: estado bruto do perfil
//    (permite distinguir "usuário comum" de "admin suspenso" mesmo quando
//     me_nivel_admin() devolve NULL por causa de suspensão).
//  - nivel: nível efetivo (NULL para suspenso/inativo/sem-perfil)
//  - is_principal: bypass total
//  - cidades: cidades acessíveis (admin_principal → todas ativas)
export const getMeuContextoAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [
      { data: isPrinc },
      { data: nivel },
      { data: cidades },
      { data: perfilRow },
    ] = await Promise.all([
      supabase.rpc("me_is_admin_principal"),
      supabase.rpc("me_nivel_admin"),
      supabase.rpc("me_cidades_acessiveis"),
      supabase
        .from("perfis_administrativos")
        .select("id,nivel,ativo,suspenso")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);
    let listaCidades: { id: string; cidade: string; estado: string; ativa: boolean }[] = [];
    if (Array.isArray(cidades) && cidades.length > 0) {
      const ids = cidades.map((c: { cidade_id: string }) => c.cidade_id);
      const { data: infos } = await supabase
        .from("cidades_configuradas")
        .select("id,cidade,estado,ativa")
        .in("id", ids);
      listaCidades = infos ?? [];
    }
    return {
      user_id: userId,
      is_principal: !!isPrinc,
      nivel: (nivel ?? null) as "admin_principal" | "subadmin" | "embaixador" | null,
      has_profile: !!perfilRow,
      perfil_ativo: perfilRow?.ativo ?? false,
      perfil_suspenso: perfilRow?.suspenso ?? false,
      perfil_nivel_bruto: (perfilRow?.nivel ?? null) as
        | "admin_principal"
        | "subadmin"
        | "embaixador"
        | null,
      cidades: listaCidades,
    };
  });

// ------- Cidades -------
export const listarCidades = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("cidades_configuradas")
      .select("id,cidade,estado,ativa,criado_em,mototaxi_ativo")
      .order("estado", { ascending: true })
      .order("cidade", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const cidadeDefinirServicos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    id: string;
    mototaxi_ativo: boolean;
  }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("admin_cidade_definir_servicos", {
      _id: data.id,
      _delivery_ativo: false,
      _mercado_ativo: false,
      _mototaxi_ativo: data.mototaxi_ativo,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ------- Lista de perfis administrativos com permissões e cidades -------
export const listarPerfisAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data: perfis, error } = await supabase
      .from("perfis_administrativos")
      .select(
        "id,user_id,nivel,ativo,suspenso,todas_cidades,observacao,criado_em,atualizado_em"
      )
      .order("criado_em", { ascending: false });
    if (error) throw new Error(error.message);
    if (!perfis || perfis.length === 0) return [];

    const userIds = perfis.map((p) => p.user_id);
    const perfilIds = perfis.map((p) => p.id);

    const [{ data: profs }, { data: gc }, { data: perms }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id,nome,telefone,tipo,ativo")
        .in("id", userIds),
      supabase
        .from("gestor_cidades")
        .select("perfil_id,cidade_id,vinculo_ativo,cidades_configuradas!inner(id,cidade,estado,ativa)")
        .in("perfil_id", perfilIds),
      supabase
        .from("permissoes_administrativas")
        .select("perfil_id,codigo,permitido")
        .in("perfil_id", perfilIds),
    ]);

    const profMap = new Map((profs ?? []).map((p) => [p.id, p]));
    return perfis.map((p) => ({
      ...p,
      profile: profMap.get(p.user_id) ?? null,
      cidades: (gc ?? [])
        .filter((g) => g.perfil_id === p.id && g.vinculo_ativo)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((g: any) => g.cidades_configuradas),
      permissoes: (perms ?? [])
        .filter((x) => x.perfil_id === p.id && x.permitido)
        .map((x) => x.codigo as string),
    }));
  });

// ------- Auditoria -------
export const listarAuditoria = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { cidade_id?: string | null; limit?: number }) => d)
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("auditoria_administrativa")
      .select("id,autor_user_id,tipo_autor,cidade_id,acao,entidade,entidade_id,dados_anteriores,dados_novos,criado_em")
      .order("criado_em", { ascending: false })
      .limit(Math.min(data.limit ?? 200, 500));
    if (data.cidade_id) q = q.eq("cidade_id", data.cidade_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    if (!rows || rows.length === 0) return [];
    const autores = Array.from(
      new Set(rows.map((r) => r.autor_user_id).filter((x): x is string => !!x)),
    );
    const { data: profs } = await context.supabase
      .from("profiles")
      .select("id,nome")
      .in("id", autores);
    const nomeMap = new Map((profs ?? []).map((p) => [p.id, p.nome]));
    return rows.map((r) => ({
      ...r,
      autor_nome: r.autor_user_id ? (nomeMap.get(r.autor_user_id) ?? null) : null,
    }));
  });

// ------- Busca de usuário existente pelo telefone -------
export const buscarUsuarioPorTelefone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { telefone: string }) => d)
  .handler(async ({ data, context }) => {
    const telefone = (data.telefone || "").replace(/\D/g, "");
    if (telefone.length < 10) throw new Error("Telefone inválido");
    // is_admin_principal check antes de qualquer coisa:
    const { data: princ } = await context.supabase.rpc("me_is_admin_principal");
    if (!princ) throw new Error("Somente admin principal pode consultar usuários.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("profiles")
      .select("id,nome,telefone,tipo,ativo")
      .eq("telefone", telefone)
      .limit(1);
    return rows?.[0] ?? null;
  });

// ------- Criar usuário administrativo (quando não existe) -------
// Cria um Auth user com senha aleatória (nunca exposta). O código de ativação
// NÃO sai por aqui — o admin precisa chamar `gerarCodigoAtivacao` explicitamente
// para vê-lo uma única vez.
export const criarUsuarioAdministrativo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { telefone: string; nome: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: princ } = await context.supabase.rpc("me_is_admin_principal");
    if (!princ) throw new Error("Somente admin principal pode criar usuários administrativos.");
    const telefone = (data.telefone || "").replace(/\D/g, "");
    const nome = (data.nome || "").trim();
    if (telefone.length !== 11) throw new Error("Telefone deve ter 11 dígitos (DDD + número).");
    if (nome.length < 2) throw new Error("Nome inválido.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = `${telefone}@motezap.app`;
    // Senha aleatória interna — nunca exposta ao frontend.
    const randomPass = `RND-${crypto.randomUUID()}-${crypto.randomUUID()}`;

    const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: randomPass,
      email_confirm: true,
      user_metadata: { nome, telefone, tipo: "passageiro" },
    });
    if (cErr || !created?.user) throw new Error(cErr?.message ?? "Falha ao criar usuário");

    return { user_id: created.user.id };
  });

// ------- Gerar código de ativação (retorno em claro APENAS AQUI, 1x) -------
// Chamada explícita: o admin dispara isso quando quer ver o código para repassar.
// O código só existe no banco como hash SHA-256. Expira em 24h, uso único.
export const gerarCodigoAtivacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { user_id: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: r, error } = await context.supabase.rpc("admin_gerar_codigo_ativacao", {
      _user_id: data.user_id,
    });
    if (error) throw new Error(error.message);
    return r as { ok: boolean; codigo: string; expira_em_horas: number };
  });

// ------- Listagens seguras com escopo hierárquico -------
export const listarEmbaixadoresEscopo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("admin_listar_embaixadores_escopo");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listarSubadmins = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("admin_listar_subadmins");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// ------- Auditoria com escopo (substitui listarAuditoria para não-principais) -------
export const listarAuditoriaEscopo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { cidade_id?: string | null; limit?: number }) => d)
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.rpc("listar_auditoria_escopo", {
      _cidade_id: data.cidade_id ?? undefined,
      _limit: data.limit ?? 200,
    });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// ------- Registrar último acesso administrativo -------
export const registrarAcessoAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase.rpc("admin_registrar_acesso");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ------- Cidades via RPCs auditadas -------
export const cidadeCriar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { cidade: string; estado: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("admin_cidade_criar", {
      _cidade: data.cidade,
      _estado: data.estado,
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

export const cidadeEditar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; cidade: string; estado: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("admin_cidade_editar", {
      _id: data.id,
      _cidade: data.cidade,
      _estado: data.estado,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const cidadeAtivar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("admin_cidade_ativar", { _id: data.id });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const cidadeSuspender = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("admin_cidade_suspender", { _id: data.id });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ------- Criar/promover subadmin -------
export const criarSubadmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      user_id: string;
      todas_cidades: boolean;
      cidade_ids: string[];
      permissoes: string[];
      observacao?: string | null;
    }) => d,
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: perfilId, error } = await supabase.rpc("admin_criar_ou_promover_subadmin", {
      _user_id: data.user_id,
      _todas_cidades: data.todas_cidades,
      _observacao: data.observacao ?? undefined,
    });
    if (error) throw new Error(error.message);
    if (!data.todas_cidades) {
      const { error: e2 } = await supabase.rpc("admin_definir_cidades_subadmin", {
        _perfil_id: perfilId as string,
        _cidade_ids: data.cidade_ids,
      });
      if (e2) throw new Error(e2.message);
    }
    for (const codigo of data.permissoes) {
      const { error: e3 } = await supabase.rpc("admin_definir_permissao", {
        _perfil_id: perfilId as string,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        _codigo: codigo as any,
        _permitido: true,
      });
      if (e3) throw new Error(e3.message);
    }
    return { perfil_id: perfilId as string };
  });

// ------- Criar embaixador -------
export const criarEmbaixador = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { user_id: string; cidade_id: string; permissoes: string[] }) => d,
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: perfilId, error } = await supabase.rpc("admin_criar_embaixador", {
      _user_id: data.user_id,
      _cidade_id: data.cidade_id,
    });
    if (error) throw new Error(error.message);
    for (const codigo of data.permissoes) {
      const { error: e3 } = await supabase.rpc("admin_definir_permissao", {
        _perfil_id: perfilId as string,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        _codigo: codigo as any,
        _permitido: true,
      });
      if (e3) throw new Error(e3.message);
    }
    return { perfil_id: perfilId as string };
  });

// ------- Alterar permissão pontual -------
export const atualizarPermissao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { perfil_id: string; codigo: string; permitido: boolean }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("admin_definir_permissao", {
      _perfil_id: data.perfil_id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      _codigo: data.codigo as any,
      _permitido: data.permitido,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ------- Atualizar cidades do subadmin -------
export const atualizarCidadesSubadmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { perfil_id: string; cidade_ids: string[] }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("admin_definir_cidades_subadmin", {
      _perfil_id: data.perfil_id,
      _cidade_ids: data.cidade_ids,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ------- Transferir embaixador -------
export const transferirEmbaixador = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { perfil_id: string; nova_cidade_id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("admin_transferir_embaixador", {
      _perfil_id: data.perfil_id,
      _nova_cidade_id: data.nova_cidade_id,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ------- Suspender/reativar perfil -------
export const suspenderPerfilAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { perfil_id: string; suspenso: boolean }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("admin_suspender_perfil", {
      _perfil_id: data.perfil_id,
      _suspenso: data.suspenso,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ------- Remover função administrativa -------
export const removerFuncaoAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { perfil_id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("admin_remover_funcao_admin", {
      _perfil_id: data.perfil_id,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ------- Contagens por cidade (indicadores) -------
export const contagensCidade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { cidade_id: string | null }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const cid = data.cidade_id;
    async function countRows(
      table: "profiles" | "corridas",
      extra?: { col: "tipo"; val: "passageiro" | "mototaxista" },
    ): Promise<number> {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q: any = supabase.from(table).select("id", { count: "exact", head: true });
      if (extra) q = q.eq(extra.col, extra.val);
      if (cid) q = q.eq("cidade_id", cid);
      const { count } = await q;
      return count ?? 0;
    }
    const [passageiros, mototaxistas, corridas] = await Promise.all([
      countRows("profiles", { col: "tipo", val: "passageiro" }),
      countRows("profiles", { col: "tipo", val: "mototaxista" }),
      countRows("corridas"),
    ]);
    return { passageiros, mototaxistas, corridas };
  });

// ------- Perfis administrativos pendentes de ativação (recuperação de criação parcial) -------
// Lista os perfis (subadmin/embaixador) e indica se já têm um código de ativação
// válido pendente. Se não tiverem, a UI mostra a ação "Gerar novo código".
export const listarPerfisPendentesAtivacao = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("admin_perfis_pendentes_ativacao");
    if (error) throw new Error(error.message);
    return (data ?? []) as Array<{
      perfil_id: string;
      user_id: string;
      nome: string | null;
      telefone: string | null;
      nivel: "subadmin" | "embaixador";
      criado_em: string;
      tem_codigo_ativo: boolean;
      codigo_expira_em: string | null;
    }>;
  });

