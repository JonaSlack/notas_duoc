const KEY = 'notafacil_v2';

let data =
    JSON.parse(localStorage.getItem(KEY) || 'null') ||
    {
        students: [],
        activeStudent: null,
        activeCourse: null
    };

/* =========================================================
   UTILIDADES
========================================================= */

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

const fmt = n =>
    Number.isFinite(n)
        ? n.toFixed(1).replace('.', ',')
        : '—';

const save = () =>
    localStorage.setItem(KEY, JSON.stringify(data));

const uid = () =>
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 7);

function esc(s) {
    return String(s).replace(
        /[&<>"']/g,
        m => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[m])
    );
}

function attr(s) {
    return esc(s);
}


/* =========================================================
   MODAL
========================================================= */

let modalAction = null;

function openModal(title, label, cb) {

    $('#modalTitle').textContent = title;
    $('#modalLabel').textContent = label;
    $('#modalInput').value = '';

    modalAction = cb;

    $('#modal').classList.remove('hidden');

    setTimeout(() => {
        $('#modalInput').focus();
    }, 50);
}

function closeModal() {

    $('#modal').classList.add('hidden');

    modalAction = null;
}

$('#modalForm').addEventListener('submit', e => {

    e.preventDefault();

    const v = $('#modalInput').value.trim();

    if (!v) return;

    modalAction?.(v);

    closeModal();
});

$('#cancelModal').onclick = closeModal;


/* =========================================================
   ESTUDIANTE Y RAMO ACTIVO
========================================================= */

function student() {

    return data.students.find(
        s => s.id === data.activeStudent
    );
}

function course() {

    return student()?.courses.find(
        c => c.id === data.activeCourse
    );
}


/* =========================================================
   CÁLCULOS DEL RAMO
========================================================= */

function calc(c) {

    const valid = c.evals.filter(e =>
        Number.isFinite(+e.grade) &&
        +e.grade >= 1 &&
        +e.grade <= 7 &&
        +e.weight > 0
    );

    const weight = valid.reduce(
        (a, e) => a + (+e.weight),
        0
    );

    const weighted = valid.reduce(
        (a, e) =>
            a + (+e.grade) * (+e.weight) / 100,
        0
    );

    const pres =
        weight
            ? weighted / (weight / 100)
            : NaN;

    const complete =
        Math.abs(weight - 100) < 0.01;

    /*
        Presentación = 60%
        Examen       = 40%
        Nota mínima  = 4,0
    */

    const needed =
        complete
            ? (4 - pres * 0.6) / 0.4
            : NaN;

    return {
        weight,
        pres,
        complete,
        needed
    };
}


/* =========================================================
   RENDER GENERAL
========================================================= */

function render() {

    save();

    const s = student();

    /* ---------- pestañas estudiantes ---------- */

    $('#studentTabs').innerHTML =
        data.students.map(x => `
            <button
                class="studentTab ${
                    x.id === data.activeStudent
                        ? 'active'
                        : ''
                }"
                data-id="${x.id}"
            >
                ${esc(x.name)}
            </button>
        `).join('');

    $$('.studentTab').forEach(b => {

        b.onclick = () => {

            data.activeStudent = b.dataset.id;
            data.activeCourse = null;

            render();
        };
    });


    /* ---------- área estudiante ---------- */

    $('#studentArea').classList.toggle(
        'hidden',
        !s
    );

    $('#heroStudent').textContent =
        s
            ? s.name
            : '—';

    $('#heroSummary').textContent =
        s
            ? `${s.courses.length} ramo${
                s.courses.length === 1 ? '' : 's'
            } registrado${
                s.courses.length === 1 ? '' : 's'
            }`
            : 'Agrega un estudiante para comenzar';

    if (!s) return;


    /* ---------- ramos ---------- */

    $('#studentTitle').textContent =
        `Ramos de ${s.name}`;

    renderCourses();

    const c = course();

    $('#courseDetail').classList.toggle(
        'hidden',
        !c
    );

    $('#courseGrid').classList.toggle(
        'hidden',
        !!c
    );

    $('.coursesHead').classList.toggle(
        'hidden',
        !!c
    );

    if (c) {
        renderDetail(c);
    }
}


/* =========================================================
   LISTADO DE RAMOS
========================================================= */

function renderCourses() {

    const s = student();

    $('#courseGrid').innerHTML =
        s.courses.length
            ? s.courses.map(c => {

                const x = calc(c);

                let need = 'Pendiente';

                if (x.complete) {

                    if (x.needed <= 1) {

                        need = 'Asegurado';

                    } else if (x.needed > 7) {

                        need = 'No alcanzable';

                    } else {

                        need = fmt(
                            Math.ceil(x.needed * 10) / 10
                        );
                    }
                }

                /*
                    Mientras las ponderaciones no lleguen
                    al 100%, mostramos promedio actual
                    como información complementaria.
                */

                const currentAverage =
                    Number.isFinite(x.pres)
                        ? fmt(x.pres)
                        : '—';

                return `
                    <article
                        class="courseCard"
                        data-id="${c.id}"
                    >

                        <small>ASIGNATURA</small>

                        <h3>
                            ${esc(c.name)}
                        </h3>

                        <div class="courseStats">

                            <div class="stat">

                                <small>
                                    ${
                                        x.complete
                                            ? 'Presentación'
                                            : 'Promedio actual'
                                    }
                                </small>

                                <b>
                                    ${currentAverage}
                                </b>

                            </div>

                            <div class="stat">

                                <small>
                                    Examen para aprobar
                                </small>

                                <b>
                                    ${need}
                                </b>

                            </div>

                        </div>

                        ${
                            !x.complete &&
                            x.weight > 0
                                ? `
                                    <small>
                                        ${Math.round(x.weight)}%
                                        de ponderaciones registradas
                                    </small>
                                `
                                : ''
                        }

                    </article>
                `;

            }).join('')

            : `
                <div class="card">

                    <b>
                        Aún no hay ramos.
                    </b>

                    <p>
                        Agrega la primera asignatura
                        para comenzar a registrar notas.
                    </p>

                </div>
            `;


    /* abrir ramo */

    $$('.courseCard').forEach(el => {

        el.onclick = () => {

            data.activeCourse =
                el.dataset.id;

            render();
        };
    });
}


/* =========================================================
   DETALLE DEL RAMO
========================================================= */

function renderDetail(c) {

    $('#courseName').textContent = c.name;

    /*
        IMPORTANTE:

        Esta parte crea las filas solamente cuando
        entramos al ramo, agregamos una evaluación,
        eliminamos una evaluación, etc.

        NO volveremos a ejecutar renderDetail()
        cada vez que el usuario presione una tecla.
    */

    $('#evalRows').innerHTML =
        c.evals.map(e => `

            <div
                class="evalRow"
                data-id="${e.id}"
            >

                <input
                    class="ename"
                    value="${attr(e.name)}"
                    aria-label="Evaluación"
                >

                <input
                    class="grade"
                    type="number"
                    min="1"
                    max="7"
                    step="0.1"
                    value="${e.grade}"
                    placeholder="1,0–7,0"
                    aria-label="Nota"
                >

                <input
                    class="weight"
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value="${e.weight}"
                    placeholder="%"
                    aria-label="Ponderación"
                >

                <span class="aporte">

                    ${
                        e.grade && e.weight
                            ? fmt(
                                +e.grade *
                                (+e.weight) /
                                100
                            )
                            : '—'
                    }

                </span>

                <button
                    class="remove"
                    type="button"
                    aria-label="Eliminar"
                >
                    ×
                </button>

            </div>

        `).join('');


    /* =====================================================
       EVENTOS DE CADA EVALUACIÓN
    ===================================================== */

    $$('.evalRow').forEach(row => {

        const e = c.evals.find(
            x => x.id === row.dataset.id
        );

        const nameInput =
            row.querySelector('.ename');

        const gradeInput =
            row.querySelector('.grade');

        const weightInput =
            row.querySelector('.weight');

        const aporte =
            row.querySelector('.aporte');


        /* ---------- nombre ---------- */

        nameInput.oninput = event => {

            e.name = event.target.value;

            save();
        };


        /* ---------- nota ---------- */

        gradeInput.oninput = event => {

            /*
                Guardamos el nuevo valor,
                pero NO reconstruimos renderDetail().
            */

            e.grade = event.target.value;

            updateRowContribution(
                e,
                aporte
            );

            /*
                Recalculamos solamente los resultados.
            */

            updateResults(c);

            save();
        };


        /* ---------- ponderación ---------- */

        weightInput.oninput = event => {

            e.weight = event.target.value;

            updateRowContribution(
                e,
                aporte
            );

            updateResults(c);

            save();
        };


        /* ---------- eliminar ---------- */

        row.querySelector('.remove').onclick =
            () => {

                c.evals =
                    c.evals.filter(
                        x => x.id !== e.id
                    );

                render();
            };
    });


    updateResults(c);
}


/* =========================================================
   ACTUALIZAR APORTE SIN PERDER FOCO
========================================================= */

function updateRowContribution(e, element) {

    const grade = +e.grade;
    const weight = +e.weight;

    if (
        Number.isFinite(grade) &&
        grade >= 1 &&
        grade <= 7 &&
        Number.isFinite(weight) &&
        weight > 0
    ) {

        element.textContent =
            fmt(
                grade *
                weight /
                100
            );

    } else {

        element.textContent = '—';
    }
}


/* =========================================================
   ACTUALIZAR RESULTADOS
========================================================= */

function updateResults(c) {

    const x = calc(c);

    const pct =
        Math.min(
            100,
            Math.max(
                0,
                x.weight
            )
        );


    /* ---------- ponderación ---------- */

    $('#weightText').textContent =
        `${Math.round(x.weight)}%`;

    $('#weightBar').style.width =
        pct + '%';


    if (x.weight > 100) {

        $('#weightMsg').textContent =
            'La ponderación supera el 100%.';

    } else if (x.complete) {

        $('#weightMsg').textContent =
            'Ponderación completa.';

    } else {

        $('#weightMsg').textContent =
            `Falta ${
                Math.max(
                    0,
                    Math.round(
                        100 - x.weight
                    )
                )
            }% para completar.`;
    }


    /* ---------- presentación ---------- */

    $('#presentation').textContent =
        x.complete
            ? fmt(x.pres)
            : '—';

    $('#presentationMsg').textContent =
        x.complete
            ? 'Esta nota equivale al 60% de tu nota final.'
            : Number.isFinite(x.pres)
                ? `Promedio actual: ${fmt(x.pres)}. Completa el 100% de tus evaluaciones.`
                : 'Completa el 100% de tus evaluaciones.';


    /* ---------- examen necesario ---------- */

    let msg =
        'Completa el 100% de tus evaluaciones.';

    let shown = '—';

    let marker = 50;


    if (x.complete) {

        if (x.needed <= 1) {

            shown = '1,0';

            msg =
                'Incluso con un 1,0 en el examen apruebas el ramo.';

            marker = 0;

        } else if (x.needed > 7) {

            shown = '> 7,0';

            msg =
                'No es posible alcanzar 4,0 solo con el examen.';

            marker = 100;

        } else {

            /*
                Redondeamos HACIA ARRIBA a una décima.

                Ejemplo:
                cálculo exacto = 3,24
                nota necesaria mostrada = 3,3

                De esta manera no le decimos al alumno
                que aprueba con una nota insuficiente.
            */

            const roundedNeeded =
                Math.ceil(
                    x.needed * 10
                ) / 10;

            shown =
                fmt(roundedNeeded);

            msg =
                `Con ${shown} o más en el examen ` +
                `alcanzas al menos un 4,0 final.`;

            marker =
                (
                    roundedNeeded - 1
                ) /
                6 *
                100;
        }
    }


    $('#neededExam').textContent =
        shown;

    $('#neededMsg').textContent =
        msg;

    $('#needMarker').style.left =
        Math.max(
            0,
            Math.min(
                100,
                marker
            )
        ) + '%';


    /* ---------- simulador ---------- */

    simulate(c, x);
}


/* =========================================================
   SIMULADOR DEL EXAMEN
========================================================= */

function simulate(c, x) {

    const ex =
        +$('#examSlider').value;

    $('#examValue').textContent =
        fmt(ex);


    /* no calcular hasta completar el 100% */

    if (!x.complete) {

        $('#finalGrade').textContent =
            '—';

        $('#finalStatus').textContent =
            'Sin datos';

        $('#finalStatus').className =
            '';

        return;
    }


    /*
        Nota final:

        presentación 60%
        examen       40%
    */

    const finalGrade =
        x.pres * 0.6 +
        ex * 0.4;


    $('#finalGrade').textContent =
        fmt(finalGrade);


    if (finalGrade >= 4) {

        $('#finalStatus').textContent =
            'APROBADO';

        $('#finalStatus').className =
            'good';

    } else {

        $('#finalStatus').textContent =
            'REPROBADO';

        $('#finalStatus').className =
            'bad';
    }
}


/* =========================================================
   SLIDER EXAMEN
========================================================= */

$('#examSlider').oninput = () => {

    const c = course();

    if (c) {

        /*
            Solamente recalculamos resultados.
            No reconstruimos los inputs.
        */

        updateResults(c);
    }
};


/* =========================================================
   AGREGAR ESTUDIANTE
========================================================= */

$('#addStudent').onclick = () => {

    openModal(
        'Agregar estudiante',
        'Nombre del estudiante',
        name => {

            const s = {

                id: uid(),

                name,

                courses: []
            };

            data.students.push(s);

            data.activeStudent =
                s.id;

            data.activeCourse =
                null;

            render();
        }
    );
};


/* =========================================================
   AGREGAR RAMO
========================================================= */

$('#addCourse').onclick = () => {

    openModal(
        'Agregar ramo',
        'Nombre de la asignatura',
        name => {

            const c = {

                id: uid(),

                name,

                evals: [

                    {
                        id: uid(),
                        name: 'Prueba 1',
                        grade: '',
                        weight: ''
                    },

                    {
                        id: uid(),
                        name: 'Prueba 2',
                        grade: '',
                        weight: ''
                    },

                    {
                        id: uid(),
                        name: 'Trabajo',
                        grade: '',
                        weight: ''
                    }

                ]
            };

            student().courses.push(c);

            data.activeCourse =
                c.id;

            render();
        }
    );
};


/* =========================================================
   AGREGAR EVALUACIÓN
========================================================= */

$('#addEval').onclick = () => {

    const c = course();

    if (!c) return;

    c.evals.push({

        id: uid(),

        name:
            `Evaluación ${c.evals.length + 1}`,

        grade: '',

        weight: ''
    });

    render();
};


/* =========================================================
   VOLVER A RAMOS
========================================================= */

$('#backCourses').onclick = () => {

    data.activeCourse =
        null;

    render();
};


/* =========================================================
   ELIMINAR RAMO
========================================================= */

$('#deleteCourse').onclick = () => {

    if (
        confirm(
            '¿Eliminar este ramo y todas sus notas?'
        )
    ) {

        const s = student();

        s.courses =
            s.courses.filter(
                c =>
                    c.id !==
                    data.activeCourse
            );

        data.activeCourse =
            null;

        render();
    }
};


/* =========================================================
   REINICIAR TODO
========================================================= */

$('#resetAll').onclick = () => {

    if (
        confirm(
            '¿Borrar todos los estudiantes, ramos y notas guardadas?'
        )
    ) {

        data = {

            students: [],

            activeStudent: null,

            activeCourse: null
        };

        render();
    }
};


/* =========================================================
   INICIO
========================================================= */

render();
