import data from '../../data/shaped_data.json'

export async function GET(){
    return new Response(JSON.stringify(data), {
        status: 200,
        headers: {
            "content-type": "application/json; charset=UTF-8",
        },
    })
}