use reqwest::Response;

pub async fn check_trailers(resp: &mut Response) {
    if let Ok(Some(trailers)) = resp.chunk().await {
        // Just checking if we can compile something like this
    }
}
